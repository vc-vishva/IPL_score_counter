#!/usr/bin/env node

const readline = require("readline");

// IPL 2022 team stats - matches, wins, losses, runs, overs, points
const pointsTable = {
  "Chennai Super Kings": {
    matches: 7,
    won: 5,
    lost: 2,
    nrr: 0.771,
    runsFor: 1130,
    runsAgainst: 1071,
    overs: 133.1,
    againstOvers: 138.5,
    points: 10,
  },
  "Royal Challengers Bangalore": {
    matches: 7,
    won: 4,
    lost: 3,
    nrr: 0.597,
    runsFor: 1217,
    runsAgainst: 1066,
    overs: 140,
    againstOvers: 131.4,
    points: 8,
  },
  "Delhi Capitals": {
    matches: 7,
    won: 4,
    lost: 3,
    nrr: 0.319,
    runsFor: 1085,
    runsAgainst: 1136,
    overs: 126,
    againstOvers: 137,
    points: 8,
  },
  "Rajasthan Royals": {
    matches: 7,
    won: 3,
    lost: 4,
    nrr: 0.331,
    runsFor: 1066,
    runsAgainst: 1094,
    overs: 128.2,
    againstOvers: 137.1,
    points: 6,
  },
  "Mumbai Indians": {
    matches: 8,
    won: 2,
    lost: 6,
    nrr: -1.75,
    runsFor: 1003,
    runsAgainst: 1134,
    overs: 155.2,
    againstOvers: 138.1,
    points: 4,
  },
};

// Convert cricket overs format: 128.2 = 128 overs + 2 balls = 128.33 overs
function displayOversToActualOvers(displayOvers) {
  const wholeOvers = Math.floor(displayOvers);
  const ballsPart = Math.round((displayOvers - wholeOvers) * 10);
  return wholeOvers + ballsPart / 6; // 6 balls per over
}

// Basic NRR formula: (team run rate) - (opposition run rate)
function calculateNRR(runsFor, oversFor, runsAgainst, oversAgainst) {
  return runsFor / oversFor - runsAgainst / oversAgainst;
}

// Get target NRR needed to reach desired position
function getTargetNRRForPosition(desiredPosition) {
  // Sort teams by points, then by NRR
  const sortedTeams = Object.entries(pointsTable)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.nrr - a.nrr;
    });

  if (desiredPosition <= sortedTeams.length) {
    // To reach position N, need to beat the NRR of team currently at position N
    const targetTeam = sortedTeams[desiredPosition - 1];
    return targetTeam.nrr + 0.001; // Slightly better than target position
  }
  return 0; // Default fallback
}

// Calculate what opposition must be restricted to (batting first scenario)
function calculateBattingFirstScenario(
  teamName,
  oppositionName,
  runsScored,
  oversPlayed,
  desiredPosition
) {
  const team = pointsTable[teamName];

  // Convert overs to actual format
  const actualOversFor = displayOversToActualOvers(team.overs);
  const actualAgainstOvers = displayOversToActualOvers(team.againstOvers);

  // Calculate new totals after this match
  const newRunsFor = team.runsFor + runsScored;
  const newOversFor = actualOversFor + oversPlayed;
  const newAgainstOvers = actualAgainstOvers + oversPlayed;

  // Get target NRR needed for desired position
  const targetNRR = getTargetNRRForPosition(desiredPosition);

  // Calculate max runs opposition can score
  // NRR = (RunsFor/OversFor) - (RunsAgainst/OversAgainst)
  // targetNRR = (newRunsFor/newOversFor) - ((team.runsAgainst + opponentRuns)/newAgainstOvers)
  // Solving for opponentRuns:
  const teamRunRate = newRunsFor / newOversFor;
  const maxConcededRate = teamRunRate - targetNRR;
  const maxTotalRunsAgainst = maxConcededRate * newAgainstOvers;
  const maxOppositionRuns = Math.floor(maxTotalRunsAgainst - team.runsAgainst);

  // Calculate range for restriction (with some buffer)
  const minRestriction = Math.max(0, maxOppositionRuns - 5);
  const maxRestriction = Math.max(0, maxOppositionRuns);

  // Calculate NRR range
  const minNRR = calculateNRR(
    newRunsFor,
    newOversFor,
    team.runsAgainst + maxRestriction,
    newAgainstOvers
  );
  const maxNRR = calculateNRR(
    newRunsFor,
    newOversFor,
    team.runsAgainst + minRestriction,
    newAgainstOvers
  );

  return {
    teamName,
    oppositionName,
    runsScored,
    oversPlayed,
    minRestriction,
    maxRestriction,
    minNRR: minNRR.toFixed(3),
    maxNRR: maxNRR.toFixed(3),
  };
}

// Calculate chase timeframe (bowling first scenario)
function calculateBowlingFirstScenario(
  teamName,
  oppositionName,
  target,
  desiredPosition
) {
  const team = pointsTable[teamName];

  // Convert overs to actual format
  const actualOversFor = displayOversToActualOvers(team.overs);
  const actualAgainstOvers = displayOversToActualOvers(team.againstOvers);

  // Get target NRR needed for desired position
  const targetNRR = getTargetNRRForPosition(desiredPosition);

  // Calculate new totals after this match
  const newRunsAgainst = team.runsAgainst + target;
  const newAgainstOvers = actualAgainstOvers + 20; // Assume 20-over match
  const newRunsFor = team.runsFor + target; // Assuming team will score exactly the target

  // Calculate required overs to achieve target NRR
  // targetNRR = (newRunsFor/(actualOversFor + chaseovers)) - (newRunsAgainst/newAgainstOvers)
  // Solving for chaseovers:
  const opponentRunRate = newRunsAgainst / newAgainstOvers;
  const requiredRunRate = targetNRR + opponentRunRate;
  const requiredOvers = newRunsFor / requiredRunRate - actualOversFor;

  // Set reasonable ranges
  const minOvers = Math.max(1.0, requiredOvers - 2.0);
  const maxOvers = Math.min(19.5, requiredOvers + 1.0);

  // Calculate NRR range
  const minNRR = calculateNRR(
    newRunsFor,
    actualOversFor + maxOvers, // Slower chase = lower NRR
    newRunsAgainst,
    newAgainstOvers
  );
  const maxNRR = calculateNRR(
    newRunsFor,
    actualOversFor + minOvers, // Faster chase = higher NRR
    newRunsAgainst,
    newAgainstOvers
  );

  return {
    teamName,
    target,
    minOvers: minOvers.toFixed(1),
    maxOvers: maxOvers.toFixed(1),
    minNRR: minNRR.toFixed(3),
    maxNRR: maxNRR.toFixed(3),
  };
}

// Test scenarios function with exact output format
function runSpecificScenarios() {
  console.log("🏏 IPL NRR CALCULATOR - FORMATTED RESULTS 🏏\n");

  // Q-1a: Rajasthan Royals batting first, scoring 120 runs vs Delhi Capitals
  console.log("• Q-1a: Answer");
  const q1a = calculateBattingFirstScenario(
    "Rajasthan Royals",
    "Delhi Capitals",
    120,
    20,
    3
  );
  console.log(
    `  o If Rajasthan Royals score ${q1a.runsScored} runs in ${q1a.oversPlayed} overs, Rajasthan Royals need to`
  );
  console.log(
    `    restrict Delhi Capitals between ${q1a.minRestriction} to ${q1a.maxRestriction} runs in ${q1a.oversPlayed} overs.`
  );
  console.log(
    `  o Revised NRR of Rajasthan Royals will be between ${q1a.minNRR} to ${q1a.maxNRR}.`
  );

  console.log();

  // Q-1b: Rajasthan Royals chasing 119 runs vs Delhi Capitals
  console.log("• Q-1b: Answer");
  const q1b = calculateBowlingFirstScenario(
    "Rajasthan Royals",
    "Delhi Capitals",
    119,
    3
  );
  console.log(
    `  o Rajasthan Royals need to chase ${q1b.target} between ${q1b.minOvers} and ${q1b.maxOvers} Overs.`
  );
  console.log(
    `  o Revised NRR for Rajasthan Royals will be between ${q1b.minNRR} to ${q1b.maxNRR}.`
  );

  console.log();

  // Q-2c: Rajasthan Royals batting first, scoring 80 runs vs Royal Challengers Bangalore
  console.log("• Q-2c: Answer");
  const q2c = calculateBattingFirstScenario(
    "Rajasthan Royals",
    "Royal Challengers Bangalore",
    80,
    20,
    3
  );
  console.log(
    `  o If Rajasthan Royals score ${q2c.runsScored} runs in ${q2c.oversPlayed} overs, Rajasthan Royals need to`
  );
  console.log(
    `    restrict Royal Challengers Bangalore between ${q2c.minRestriction} to ${q2c.maxRestriction} runs in ${q2c.oversPlayed} overs.`
  );
  console.log(
    `  o Revised NRR of Rajasthan Royals will be between ${q2c.minNRR} to ${q2c.maxNRR}.`
  );

  console.log();

  // Q-2d: Rajasthan Royals chasing 79 runs vs Royal Challengers Bangalore
  console.log("• Q-2d: Answer");
  const q2d = calculateBowlingFirstScenario(
    "Rajasthan Royals",
    "Royal Challengers Bangalore",
    79,
    3
  );
  console.log(
    `  o Rajasthan Royals need to chase ${q2d.target} between ${q2d.minOvers} and ${q2d.maxOvers} Overs.`
  );
  console.log(
    `  o Revised NRR for Rajasthan Royals will be between ${q2d.minNRR} to ${q2d.maxNRR}.`
  );

  console.log();
}

// Input validation helpers
function validateTeamName(teamName) {
  return pointsTable.hasOwnProperty(teamName);
}

function validateNumericInput(input, min = 0, max = Infinity) {
  const num = parseFloat(input);
  return !isNaN(num) && num >= min && num <= max;
}

function getTeamNames() {
  return Object.keys(pointsTable);
}

// Main interactive application
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (question) => {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  };

  // Display welcome message and teams
  console.log("=".repeat(70));
  console.log("🏏 IPL 2022 NET RUN RATE CALCULATOR 🏏");
  console.log("=".repeat(70));
  console.log("Available Teams:");
  getTeamNames().forEach((team, index) => {
    const nrr = pointsTable[team].nrr;
    const nrrColor = nrr > 0 ? "📈" : nrr < -0.5 ? "📉" : "📊";
    console.log(`${index + 1}. ${team} ${nrrColor} (NRR: ${nrr})`);
  });
  console.log("=".repeat(70));

  try {
    // Get user inputs with validation
    let yourTeam;
    do {
      yourTeam = await askQuestion("Enter Your Team Name: ");
      if (!validateTeamName(yourTeam)) {
        console.log("❌ Invalid team name. Please choose from the list above.");
      }
    } while (!validateTeamName(yourTeam));

    let oppositionTeam;
    do {
      oppositionTeam = await askQuestion("Enter Opposition Team Name: ");
      if (!validateTeamName(oppositionTeam)) {
        console.log("❌ Invalid team name. Please choose from the list above.");
      } else if (oppositionTeam === yourTeam) {
        console.log("❌ Opposition team cannot be the same as your team.");
        oppositionTeam = "";
      }
    } while (!validateTeamName(oppositionTeam) || oppositionTeam === yourTeam);

    let matchOvers;
    do {
      const oversInput = await askQuestion(
        "How many overs match? (e.g., 20): "
      );
      if (!validateNumericInput(oversInput, 1, 50)) {
        console.log("❌ Please enter a valid number of overs (1-50).");
      } else {
        matchOvers = parseFloat(oversInput);
      }
    } while (!matchOvers);

    let desiredPosition;
    do {
      const positionInput = await askQuestion(
        "Desired Position for Your Team in Points Table (1-5): "
      );
      if (
        !validateNumericInput(positionInput, 1, 5) ||
        !Number.isInteger(parseFloat(positionInput))
      ) {
        console.log("❌ Please enter a valid position (1-5).");
      } else {
        desiredPosition = parseInt(positionInput);
      }
    } while (!desiredPosition);

    let tossResult;
    do {
      tossResult = await askQuestion(
        "Toss Result (1: Batting First, 2: Bowling First): "
      );
      if (!["1", "2"].includes(tossResult)) {
        console.log(
          "❌ Please enter 1 for Batting First or 2 for Bowling First."
        );
      }
    } while (!["1", "2"].includes(tossResult));

    let runs;
    if (tossResult === "1") {
      do {
        const runsInput = await askQuestion("Runs Scored: ");
        if (!validateNumericInput(runsInput, 0, 500)) {
          console.log("❌ Please enter a valid number of runs (0-500).");
        } else {
          runs = parseInt(runsInput);
        }
      } while (runs === undefined);
    } else {
      do {
        const runsInput = await askQuestion("Runs to Chase: ");
        if (!validateNumericInput(runsInput, 1, 500)) {
          console.log(
            "❌ Please enter a valid number of runs to chase (1-500)."
          );
        } else {
          runs = parseInt(runsInput);
        }
      } while (runs === undefined);
    }

    // Display results
    console.log("\n" + "=".repeat(70));
    console.log("📊 CALCULATION RESULTS");
    console.log("=".repeat(70));

    if (tossResult === "1") {
      // Batting first scenario
      const result = calculateBattingFirstScenario(
        yourTeam,
        oppositionTeam,
        runs,
        matchOvers,
        desiredPosition
      );

      console.log("• Answer:");
      console.log(
        `  o If ${yourTeam} score ${result.runsScored} runs in ${result.oversPlayed} overs, ${yourTeam} need to`
      );
      console.log(
        `    restrict ${result.oppositionName} between ${result.minRestriction} to ${result.maxRestriction} runs in ${result.oversPlayed} overs.`
      );
      console.log(
        `  o Revised NRR of ${yourTeam} will be between ${result.minNRR} to ${result.maxNRR}.`
      );
    } else {
      // Bowling first scenario
      const result = calculateBowlingFirstScenario(
        yourTeam,
        oppositionTeam,
        runs,
        desiredPosition
      );

      console.log("• Answer:");
      console.log(
        `  o ${yourTeam} need to chase ${result.target} between ${result.minOvers} and ${result.maxOvers} Overs.`
      );
      console.log(
        `  o Revised NRR for ${yourTeam} will be between ${result.minNRR} to ${result.maxNRR}.`
      );
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ Calculation completed successfully!");
    console.log("=".repeat(70));
  } catch (error) {
    console.error("❌ An error occurred:", error.message);
  } finally {
    rl.close();
  }
}

// Entry point - check for command line args
if (process.argv.includes("--scenarios")) {
  runSpecificScenarios();
} else {
  main();
}

// Export functions for use as module
module.exports = {
  calculateNRR,
  calculateBattingFirstScenario,
  calculateBowlingFirstScenario,
  getTargetNRRForPosition,
  validateTeamName,
  validateNumericInput,
  displayOversToActualOvers,
};
