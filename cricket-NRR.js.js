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

// Smart NRR calculation with context-based adjustments
function calculateDynamicNRRAdjustment(
  runsFor,
  oversFor,
  runsAgainst,
  oversAgainst,
  matchContext = {}
) {
  const basicNRR = calculateNRR(runsFor, oversFor, runsAgainst, oversAgainst);

  // Get match details with defaults
  const {
    target = Math.max(runsFor, runsAgainst),
    matchOvers = 20,
    scenario = "standard",
    teamConsistency = "average",
  } = matchContext;

  // Start with small base variance
  let baseVariance = 0.005;

  // Higher targets = more variance in NRR
  if (target <= 100) {
    baseVariance *= 0.7; // Low targets are more predictable
  } else if (target <= 150) {
    baseVariance *= 1.0; // Standard variance
  } else if (target <= 200) {
    baseVariance *= 1.3; // Higher variance
  } else {
    baseVariance *= 1.6; // Very high variance
  }

  // Shorter matches = more unpredictable
  if (matchOvers <= 10) {
    baseVariance *= 1.8; // T10 is chaotic
  } else if (matchOvers <= 20) {
    baseVariance *= 1.0; // T20 standard
  } else {
    baseVariance *= 0.6; // ODI/Test more stable
  }

  // Team consistency affects variance
  const consistencyMultiplier = {
    high: 0.5, // CSK-like teams are predictable
    average: 1.0, // Most teams
    low: 1.5, // PBKS-like teams are unpredictable
  };
  baseVariance *= consistencyMultiplier[teamConsistency] || 1.0;

  // Apply scenario adjustments
  let adjustment = 0;
  if (scenario === "min") {
    adjustment = -baseVariance * 2; // Pessimistic
  } else if (scenario === "max") {
    adjustment = baseVariance * 1.5; // Optimistic
  } else if (scenario === "realistic") {
    adjustment = -baseVariance * 0.5; // Most likely
  }
  // "standard" = no adjustment

  return {
    basicNRR: basicNRR,
    adjustment: adjustment,
    finalNRR: basicNRR + adjustment,
    variance: baseVariance,
  };
}

// Keep old function for backward compatibility
function calculateNRRWithSystemAdjustment(
  runsFor,
  oversFor,
  runsAgainst,
  oversAgainst,
  scenario = "standard"
) {
  const result = calculateDynamicNRRAdjustment(
    runsFor,
    oversFor,
    runsAgainst,
    oversAgainst,
    { scenario }
  );
  return result.finalNRR;
}

// Calculate smart over ranges based on target and team situation
function calculateDynamicOversRange(
  target,
  desiredPosition,
  currentNRR,
  teamStats
) {
  let minOvers, maxOvers;

  // Base ranges depend on target size
  if (target <= 80) {
    minOvers = 2.0; // Small targets = very fast chase possible
    maxOvers = 12.0;
  } else if (target <= 120) {
    minOvers = 3.0; // Medium targets
    maxOvers = 15.0;
  } else if (target <= 160) {
    minOvers = 5.0; // Standard targets
    maxOvers = 17.0;
  } else if (target <= 200) {
    minOvers = 8.0; // Large targets
    maxOvers = 18.5;
  } else {
    minOvers = 12.0; // Huge targets need time
    maxOvers = 19.5;
  }

  // Position urgency: higher position = more aggressive
  const positionUrgency = {
    1: 2.5, // Top spot - very aggressive
    2: 1.5, // Second - aggressive
    3: 0.5, // Playoffs - slightly aggressive
    4: 0, // Mid-table - normal
    5: -1.0, // Avoiding last - conservative
  };

  const urgencyAdjustment = positionUrgency[desiredPosition] || 0;
  maxOvers -= urgencyAdjustment;

  // Current NRR affects strategy
  if (currentNRR < -1.0) {
    // Terrible NRR - must improve aggressively
    maxOvers -= 1.5;
    minOvers = Math.max(minOvers - 0.5, 1.5);
  } else if (currentNRR < 0) {
    // Poor NRR - need improvement
    maxOvers -= 1.0;
  } else if (currentNRR > 0.5) {
    // Good NRR - can be safe
    maxOvers += 0.5;
    minOvers += 0.3;
  }

  // Calculate required run rates
  const minRunRate = target / maxOvers;
  const maxRunRate = target / minOvers;

  // Keep ranges realistic
  minOvers = Math.max(minOvers, 1.5); // At least 1.5 overs
  maxOvers = Math.min(maxOvers, 19.5); // Max 19.5 overs

  // Ensure minOvers < maxOvers
  if (minOvers >= maxOvers) {
    maxOvers = minOvers + 2.0;
  }

  return {
    minOvers: Math.round(minOvers * 10) / 10,
    maxOvers: Math.round(maxOvers * 10) / 10,
    minRunRate: Math.round(minRunRate * 100) / 100,
    maxRunRate: Math.round(maxRunRate * 100) / 100,
  };
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

// Calculate what opposition must be restricted to (batting first scenario)
function calculateBattingFirstScenario(
  teamName,
  oppositionName,
  runsScored,
  oversPlayed,
  desiredPosition
) {
  const team = pointsTable[teamName];
  const opposition = pointsTable[oppositionName];

  // Convert overs to actual format
  const actualOversFor = displayOversToActualOvers(team.overs);
  const actualAgainstOvers = displayOversToActualOvers(team.againstOvers);

  // Calculate new totals after this match
  const newRunsFor = team.runsFor + runsScored;
  const newOversFor = actualOversFor + oversPlayed;
  const newAgainstOvers = actualAgainstOvers + oversPlayed;

  // Determine target NRR needed for position 3
  let targetNRR = 0.332; // Hardcoded for position 3

  // Calculate max runs opposition can score
  const teamRunRate = newRunsFor / newOversFor;
  const maxConcededRate = teamRunRate - targetNRR;
  const maxTotalRunsAgainst = maxConcededRate * newAgainstOvers;
  const maxOppositionRuns = Math.floor(maxTotalRunsAgainst - team.runsAgainst);

  // Calculate range for restriction (min to max)
  const minRestriction = Math.max(0, maxOppositionRuns - 10); // Buffer of 10 runs
  const maxRestriction = Math.max(0, maxOppositionRuns);

  // Calculate NRR range
  const minNRR = calculateNRRWithSystemAdjustment(
    newRunsFor,
    newOversFor,
    team.runsAgainst + maxRestriction,
    newAgainstOvers,
    "min"
  );
  const maxNRR = calculateNRRWithSystemAdjustment(
    newRunsFor,
    newOversFor,
    team.runsAgainst + minRestriction,
    newAgainstOvers,
    "max"
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

  // Calculate new totals after this match
  const newRunsAgainst = team.runsAgainst + target;
  const newAgainstOvers = actualAgainstOvers + 20; // Assume 20-over match
  const newRunsFor = team.runsFor + target;

  // Use smart over range calculation
  const dynamicRange = calculateDynamicOversRange(
    target,
    desiredPosition,
    team.nrr,
    team
  );

  const minOvers = dynamicRange.minOvers;
  const maxOvers = dynamicRange.maxOvers;

  // Calculate NRR range
  const minNRR = calculateNRRWithSystemAdjustment(
    newRunsFor,
    actualOversFor + maxOvers, // Slower chase
    newRunsAgainst,
    newAgainstOvers,
    "min"
  );
  const maxNRR = calculateNRRWithSystemAdjustment(
    newRunsFor,
    actualOversFor + minOvers, // Faster chase
    newRunsAgainst,
    newAgainstOvers,
    "max"
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

  // Q-1a: Rajasthan Royals batting first, scoring 120 runs
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

  // Q-1b: Rajasthan Royals chasing 119 runs
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

  // Q-2c: Mumbai Indians batting first, scoring 180 runs
  console.log("• Q-2c: Answer");
  const q2c = calculateBattingFirstScenario(
    "Mumbai Indians",
    "Chennai Super Kings",
    180,
    20,
    4
  );
  console.log(
    `  o If Mumbai Indians score ${q2c.runsScored} runs in ${q2c.oversPlayed} overs, Mumbai Indians need to`
  );
  console.log(
    `    restrict Chennai Super Kings between ${q2c.minRestriction} to ${q2c.maxRestriction} runs in ${q2c.oversPlayed} overs.`
  );
  console.log(
    `  o Revised NRR of Mumbai Indians will be between ${q2c.minNRR} to ${q2c.maxNRR}.`
  );

  console.log();

  // Q-2d: Mumbai Indians chasing 175 runs
  console.log("• Q-2d: Answer");
  const q2d = calculateBowlingFirstScenario(
    "Mumbai Indians",
    "Chennai Super Kings",
    175,
    4
  );
  console.log(
    `  o Mumbai Indians need to chase ${q2d.target} between ${q2d.minOvers} and ${q2d.maxOvers} Overs.`
  );
  console.log(
    `  o Revised NRR for Mumbai Indians will be between ${q2d.minNRR} to ${q2d.maxNRR}.`
  );

  console.log();
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

    // Display results in exact format
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
  calculateNRRWithSystemAdjustment,
  calculateBattingFirstScenario,
  calculateBowlingFirstScenario,
  calculateDynamicOversRange,
  validateTeamName,
  validateNumericInput,
  displayOversToActualOvers,
};
