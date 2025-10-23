#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("========================================");
console.log("Starting Medusa Backend on Railway");
console.log("========================================");
console.log("Node version:", process.version);
console.log("Working directory:", process.cwd());
console.log("Environment:", process.env.NODE_ENV);
console.log("========================================\n");

const MEDUSA_SERVER_PATH = path.join(process.cwd(), ".medusa", "server");

try {
  // Step 1: Verify build output exists
  console.log("Step 1: Verifying build output...");
  if (!fs.existsSync(MEDUSA_SERVER_PATH)) {
    throw new Error(
      `.medusa/server directory not found at ${MEDUSA_SERVER_PATH}. Build may have failed.`
    );
  }
  console.log("✓ Build output exists\n");

  // Step 2: Check required environment variables
  console.log("Step 2: Checking environment variables...");
  const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET", "COOKIE_SECRET"];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
  console.log("✓ All required environment variables are set\n");

  // Step 3: Run init-backend (migrations and setup)
  console.log("Step 3: Running init-backend (migrations and setup)...");
  console.log("This may take a few minutes on first deployment...\n");

  try {
    execSync("init-backend", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("\n✓ Init-backend completed successfully\n");
  } catch (error) {
    console.error("Warning: init-backend command failed or not found");
    console.error("Attempting to continue anyway...\n");
  }

  // Step 4: Start Medusa server
  console.log("Step 4: Starting Medusa server...");
  console.log(`Changing directory to: ${MEDUSA_SERVER_PATH}\n`);

  process.chdir(MEDUSA_SERVER_PATH);

  console.log("Executing: medusa start");
  console.log("Server should be available shortly...\n");
  console.log("========================================\n");

  // Use spawn to keep the process alive
  const { spawn } = require("child_process");
  const medusaProcess = spawn("medusa", ["start"], {
    stdio: "inherit",
    env: process.env,
  });

  medusaProcess.on("error", (error) => {
    console.error("Failed to start Medusa:", error);
    process.exit(1);
  });

  medusaProcess.on("exit", (code) => {
    console.log(`Medusa process exited with code ${code}`);
    process.exit(code);
  });
} catch (error) {
  console.error("\n========================================");
  console.error("ERROR: Failed to start backend");
  console.error("========================================");
  console.error(error.message);
  console.error("\nStack trace:");
  console.error(error.stack);
  console.error("========================================\n");
  process.exit(1);
}
