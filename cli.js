#!/usr/bin/env node

require("dotenv").config();
const { program } = require("commander");
const chalk = require("chalk");
const ora = require("ora");
const figlet = require("figlet");

const complexMovieAnalysis = require("./complex-movie-aggregation");
const complexAirbnbAnalysis = require("./airbnb-market-analysis");

// Display banner
function showBanner() {
  console.log(
    chalk.cyan(
      figlet.textSync("MongoDB Analytics", {
        font: "Standard",
        horizontalLayout: "default",
      })
    )
  );
  console.log(chalk.gray("  Advanced MongoDB Aggregation Analysis Tool\n"));
}

// Run movie analysis
async function runMovieAnalysis() {
  const spinner = ora({
    text: chalk.blue("Starting movie analysis..."),
    spinner: "dots",
  }).start();

  try {
    spinner.stop();
    await complexMovieAnalysis();
    console.log(chalk.green("\n✓ Movie analysis completed successfully!"));
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("\n✗ Movie analysis failed:"), error.message);
    process.exit(1);
  }
}

// Run Airbnb analysis
async function runAirbnbAnalysis() {
  const spinner = ora({
    text: chalk.blue("Starting Airbnb market analysis..."),
    spinner: "dots",
  }).start();

  try {
    spinner.stop();
    await complexAirbnbAnalysis();
    console.log(chalk.green("\n✓ Airbnb analysis completed successfully!"));
  } catch (error) {
    spinner.stop();
    console.error(chalk.red("\n✗ Airbnb analysis failed:"), error.message);
    process.exit(1);
  }
}

// Run both analyses
async function runAllAnalyses() {
  console.log(chalk.yellow("\n📊 Running all analyses...\n"));
  console.log(chalk.cyan("═".repeat(60)));

  try {
    await runMovieAnalysis();
    console.log(chalk.cyan("\n" + "═".repeat(60) + "\n"));
    await runAirbnbAnalysis();
    console.log(chalk.cyan("\n" + "═".repeat(60)));
    console.log(
      chalk.green.bold("\n🎉 All analyses completed successfully!\n")
    );
  } catch (error) {
    console.error(chalk.red("\n✗ Analysis suite failed:"), error.message);
    process.exit(1);
  }
}

// List available analyses
function listAnalyses() {
  console.log(chalk.bold("\n📋 Available Analyses:\n"));
  console.log(
    chalk.cyan("  1. movies") + "  - Complex movie aggregation analysis"
  );
  console.log(
    chalk.yellow("     • ") +
      "Analyzes 21,000+ movies from sample_mflix database"
  );
  console.log(
    chalk.yellow("     • ") +
      "Decade trends, genre statistics, director rankings"
  );
  console.log(
    chalk.yellow("     • ") +
      "Weighted scoring algorithm combining ratings and awards"
  );
  console.log(chalk.yellow("     • ") + "Output: aggregation-results.json\n");

  console.log(
    chalk.cyan("  2. airbnb") + "  - Airbnb market intelligence analysis"
  );
  console.log(
    chalk.yellow("     • ") +
      "Analyzes 5,500+ listings from sample_airbnb database"
  );
  console.log(
    chalk.yellow("     • ") +
      "Market opportunities, pricing strategies, value scores"
  );
  console.log(
    chalk.yellow("     • ") +
      "Property type analysis, booking potential metrics"
  );
  console.log(
    chalk.yellow("     • ") + "Output: airbnb-analysis-results.json\n"
  );

  console.log(
    chalk.cyan("  3. all") + "     - Run all analyses sequentially\n"
  );
}

// Check environment
function checkEnvironment() {
  if (!process.env.MONGODB_URI) {
    console.error(
      chalk.red("\n✗ Error: MONGODB_URI environment variable is not set")
    );
    console.log(chalk.yellow("\nPlease create a .env file with:"));
    console.log(
      chalk.gray("  MONGODB_URI=mongodb+srv://your-connection-string\n")
    );
    process.exit(1);
  }
  console.log(chalk.green("✓ Environment configured\n"));
}

// Main CLI setup
program
  .name("mongodb-analytics")
  .description("Advanced MongoDB aggregation analysis tool")
  .version("1.0.0")
  .hook("preAction", () => {
    showBanner();
  });

// Run command
program
  .command("run <analysis>")
  .description("Run a specific analysis (movies, airbnb, or all)")
  .action(async (analysis) => {
    checkEnvironment();

    switch (analysis.toLowerCase()) {
      case "movies":
      case "movie":
        await runMovieAnalysis();
        break;

      case "airbnb":
        await runAirbnbAnalysis();
        break;

      case "all":
        await runAllAnalyses();
        break;

      default:
        console.error(chalk.red(`\n✗ Unknown analysis: ${analysis}`));
        console.log(chalk.yellow("\nAvailable options: movies, airbnb, all\n"));
        listAnalyses();
        process.exit(1);
    }
  });

// List command
program
  .command("list")
  .description("List all available analyses")
  .action(() => {
    listAnalyses();
  });

// Info command
program
  .command("info")
  .description("Display database connection information")
  .action(() => {
    checkEnvironment();
    const uri = process.env.MONGODB_URI;

    // Mask the connection string for security
    const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");

    console.log(chalk.bold("\n🔌 Database Connection Info:\n"));
    console.log(chalk.cyan("  Connection URI: ") + chalk.gray(maskedUri));
    console.log(chalk.cyan("  Status: ") + chalk.green("Configured ✓\n"));
  });

// Interactive mode
program
  .command("interactive")
  .alias("i")
  .description("Run in interactive mode")
  .action(async () => {
    checkEnvironment();

    const inquirer = (await import("inquirer")).default;

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "analysis",
        message: "Which analysis would you like to run?",
        choices: [
          {
            name: "🎬 Movie Analysis - Decade trends, genre statistics, director rankings",
            value: "movies",
          },
          {
            name: "🏠 Airbnb Analysis - Market intelligence, pricing strategies, opportunities",
            value: "airbnb",
          },
          {
            name: "📊 Run All Analyses - Execute both analyses sequentially",
            value: "all",
          },
        ],
      },
    ]);

    console.log("");

    switch (answers.analysis) {
      case "movies":
        await runMovieAnalysis();
        break;
      case "airbnb":
        await runAirbnbAnalysis();
        break;
      case "all":
        await runAllAnalyses();
        break;
    }
  });

// Default action (no command)
program.action(() => {
  listAnalyses();
  console.log(chalk.gray("Run with --help for more options\n"));
});

// Parse arguments
program.parse(process.argv);

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.help();
}
