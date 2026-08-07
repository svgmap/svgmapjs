
import { jest } from "@jest/globals";

export const TestResetUtility = {
  resetAll: () => {
    jest.clearAllMocks();
    jest.resetModules();
  }
};
