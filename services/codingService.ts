
import { GoogleGenAI, Type } from '@google/genai';
import { CodingProblem, RunResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using the provided RapidAPI Key
const RAPID_API_KEY = 'd372928d84msh6d0a1cbda4df707p1c8e24jsn1ddf9e9e704b';
const JUDGE0_HOST = 'judge0-ce.p.rapidapi.com';

export class CodingService {
  async generateProblem(): Promise<CodingProblem> {
    // RETURNS A FIXED PROBLEM AS REQUESTED TO ENSURE STABILITY
    // In a production app, you might want to switch this back to dynamic generation
    // or fetch from a database of approved questions.
    
    return {
      title: "Maximum Score after Split",
      description: "Given a string `s` of zeros and ones, return the maximum score after splitting the string into two non-empty substrings (i.e. left substring and right substring).\n\nThe score after splitting a string is the number of zeros in the left substring plus the number of ones in the right substring.",
      difficulty: "Easy",
      entryFunctionName: "maxScore",
      functionSignature: {
        javascript: "function maxScore(s) {\n  // Write your code here\n  return 0;\n}",
        python: "def maxScore(s):\n    # Write your code here\n    pass"
      },
      testCases: [
        {
          input: "[\"011101\"]",
          expectedOutput: "5"
        },
        {
          input: "[\"00111\"]",
          expectedOutput: "5"
        },
        {
          input: "[\"1111\"]",
          expectedOutput: "3"
        },
        {
          input: "[\"0000\"]",
          expectedOutput: "3"
        },
        {
          input: "[\"01\"]",
          expectedOutput: "2"
        }
      ]
    };
  }

  async evaluateCode(code: string, language: 'javascript' | 'python', problem: CodingProblem): Promise<RunResult> {
    const languageId = language === 'python' ? 71 : 63; // 71: Python 3.8.1, 63: Node.js 12.14.0
    
    // Construct the driver code that wraps user code and runs tests
    const sourceCode = language === 'python' 
      ? this.getPythonDriver(code, problem)
      : this.getJavascriptDriver(code, problem);

    // DEBUG: Print code to console
    console.log("--- DEBUG: CODE SENT TO JUDGE0 ---");
    console.log(sourceCode);
    console.log("----------------------------------");

    const encodedSource = btoa(unescape(encodeURIComponent(sourceCode)));

    try {
      const response = await fetch(`https://${JUDGE0_HOST}/submissions?base64_encoded=true&wait=true`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-key': RAPID_API_KEY,
          'x-rapidapi-host': JUDGE0_HOST,
        },
        body: JSON.stringify({
          language_id: languageId,
          source_code: encodedSource,
        })
      });

      const data = await response.json();

      if (data.status?.id !== 3) {
        // Compilation Error or Runtime Error (outside our try/catch block)
        return {
          passedCount: 0,
          totalCount: problem.testCases.length,
          results: [],
          error: atob(data.stderr || data.compile_output || "") || "Unknown Execution Error"
        };
      }

      const stdout = atob(data.stdout || "");
      
      // Parse our custom output format
      const jsonStart = stdout.indexOf('---JSON_START---');
      const jsonEnd = stdout.indexOf('---JSON_END---');
      const errorStart = stdout.indexOf('---ERROR_START---');
      
      if (errorStart !== -1) {
        const errorMsg = stdout.substring(errorStart + 17, stdout.indexOf('---ERROR_END---')).trim();
        return {
          passedCount: 0,
          totalCount: problem.testCases.length,
          results: [],
          error: errorMsg
        };
      }

      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = stdout.substring(jsonStart + 16, jsonEnd).trim();
        const results = JSON.parse(jsonStr);
        const passedCount = results.filter((r: any) => r.passed).length;
        
        return {
          passedCount,
          totalCount: results.length,
          results
        };
      }

      return {
        passedCount: 0,
        totalCount: problem.testCases.length,
        results: [],
        error: "No result data returned from test runner."
      };

    } catch (e: any) {
      console.error(e);
      return {
        passedCount: 0,
        totalCount: problem.testCases.length,
        results: [],
        error: e.message || "Failed to connect to execution service."
      };
    }
  }

  private getPythonDriver(userCode: string, problem: CodingProblem): string {
    return `
import json
import sys

# User Code
${userCode}

# Test Harness
tests_json = '${JSON.stringify(problem.testCases).replace(/'/g, "\\'").replace(/\\/g, "\\\\")}'
tests = json.loads(tests_json)
results = []
entry_function = ${problem.entryFunctionName}

try:
    for t in tests:
        # Input is expected to be a JSON string of a list of arguments
        args = json.loads(t['input'])
        if not isinstance(args, list):
            args = [args]
            
        # Execute User Function
        ret = entry_function(*args)
        
        expected = json.loads(t['expectedOutput'])
        
        # Compare
        passed = ret == expected
        results.append({
            "passed": passed,
            "input": t['input'],
            "expected": t['expectedOutput'],
            "actual": json.dumps(ret)
        })

    print("---JSON_START---")
    print(json.dumps(results))
    print("---JSON_END---")

except Exception as e:
    print("---ERROR_START---")
    print(str(e))
    print("---ERROR_END---")
`;
  }

  private getJavascriptDriver(userCode: string, problem: CodingProblem): string {
    return `
// User Code
${userCode}

// Test Harness
const tests = ${JSON.stringify(problem.testCases)};
const results = [];
const entryFunction = ${problem.entryFunctionName};

function isEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

try {
  tests.forEach(t => {
    const args = JSON.parse(t.input);
    const argsArray = Array.isArray(args) ? args : [args];
    
    const ret = entryFunction(...argsArray);
    const expected = JSON.parse(t.expectedOutput);
    
    const passed = isEqual(ret, expected);
    
    results.push({
      passed,
      input: t.input,
      expected: t.expectedOutput,
      actual: JSON.stringify(ret)
    });
  });
  
  console.log("---JSON_START---");
  console.log(JSON.stringify(results));
  console.log("---JSON_END---");

} catch (e) {
  console.log("---ERROR_START---");
  console.log(e.toString());
  console.log("---ERROR_END---");
}
`;
  }
}
