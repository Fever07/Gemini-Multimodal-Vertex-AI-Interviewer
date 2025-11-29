
export interface AvatarState {
  isTalking: boolean;
  isConnected: boolean;
  volume: number;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface AudioVisualizerProps {
  isPlaying: boolean;
  volume: number;
}

export interface TestCase {
  input: string; // JSON string representing arguments array
  expectedOutput: string; // JSON string representing return value
}

export interface CodingProblem {
  title: string;
  description: string;
  difficulty: string;
  entryFunctionName: string; // The name of the function to call
  functionSignature: {
    javascript: string;
    python: string;
  };
  testCases: TestCase[];
}

export interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
}

export interface RunResult {
  passedCount: number;
  totalCount: number;
  results: TestResult[];
  error?: string; // Compilation or runtime error message
}
