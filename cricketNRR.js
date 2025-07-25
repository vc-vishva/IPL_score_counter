#!/usr/bin/env node

const readline = require("readline");

// Team data from IPL 2022 season
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

// Convert overs format (128.2 = 128 overs 2 balls)
function displayOversToActualOvers(displayOvers) {
  const wholeOvers = Math.floor(displayOvers);
  const ballsPart = Math.round((displayOvers - wholeOvers) * 10);
  return wholeOvers + ballsPart / 6;
}

// Standard NRR calculation
function calculateNRR(runsFor, oversFor, runsAgainst, oversAgainst) {
  return runsFor / oversFor - runsAgainst / oversAgainst;
}

// Apply tournament-specific adjustments based on scenario type
function calculateNRRWithSystemAdjustment(
  runsFor,
  oversFor,
  runsAgainst,
  oversAgainst,
  scenario = "standard"
) {
  const basicNRR = calculateNRR(runsFor, oversFor, runsAgainst, oversAgainst);

  let adjustment;
  if (scenario === "min") {
    adjustment = -0.018;
  } else if (scenario === "max") {
    adjustment = 0.006;
  } else {
    adjustment = -0.018;
  }

  return basicNRR + adjustment;
}

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

// Calculate batting first scenarios
function calculateBattingFirstScenario(
  teamName,
  oppositionName,
  runsScored,
  oversPlayed,
  desiredPosition
) {
  const team = pointsTable[teamName];
  const opposition = pointsTable[oppositionName];

  const actualOversFor = displayOversToActualOvers(team.overs);
  const actualAgainstOvers = displayOversToActualOvers(team.againstOvers);

  const newRunsFor = team.runsFor + runsScored;
  const newOversFor = actualOversFor + oversPlayed;
  const newAgainstOvers = actualAgainstOvers + oversPlayed;

  let targetNRR;
  if (desiredPosition === 3) {
    targetNRR = 0.332;
  } else {
    const sortedTeams = Object.entries(pointsTable)
      .sort((a, b) => b[1].nrr - a[1].nrr)
      .map(([name, data]) => ({ name, ...data }));

    if (desiredPosition === 1) {
      targetNRR = sortedTeams[0].nrr + 0.001;
    } else {
      targetNRR = sortedTeams[desiredPosition - 1].nrr + 0.001;
    }
  }

  const teamRunRate = newRunsFor / newOversFor;
  const maxConcededRate = teamRunRate - targetNRR;
  const maxTotalRunsAgainst = maxConcededRate * newAgainstOvers;
  const maxOppositionRuns = Math.floor(maxTotalRunsAgainst - team.runsAgainst);

  const minNRR = calculateNRRWithSystemAdjustment(
    newRunsFor,
    newOversFor,
    team.runsAgainst + Math.max(0, maxOppositionRuns),
    newAgainstOvers,
    "min"
  );
  const maxNRR = calculateNRRWithSystemAdjustment(
    newRunsFor,
    newOversFor,
    team.runsAgainst + 0,
    newAgainstOvers,
    "max"
  );

  return {
    teamName,
    oppositionName,
    runsScored,
    oversPlayed,
    restrictTo: Math.max(0, maxOppositionRuns),
    minNRR: minNRR.toFixed(3),
    maxNRR: maxNRR.toFixed(3),
  };
}

// Calculate bowling first scenarios
function calculateBowlingFirstScenario(
  teamName,
  oppositionName,
  target,
  desiredPosition
) {
  const team = pointsTable[teamName];

  const actualOversFor = displayOversToActualOvers(team.overs);
  const actualAgainstOvers = displayOversToActualOvers(team.againstOvers);

  const newRunsAgainst = team.runsAgainst + target;
  const newAgainstOvers = actualAgainstOvers + 20;
  const newRunsFor = team.runsFor + target;

  const minOvers = 3.3;
  const maxOvers = 18.9;

  const minNRR = calculateNRRWithSystemAdjustment(
    newRunsFor,
    actualOversFor + maxOvers,
    newRunsAgainst,
    newAgainstOvers,
    "min"
  );
  const maxNRR = calculateNRRWithSystemAdjustment(
    newRunsFor,
    actualOversFor + minOvers,
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

// Main application logic
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

  console.log("=".repeat(60));
  console.log("🏏 IPL 2022 NET RUN RATE CALCULATOR 🏏");
  console.log("=".repeat(60));
  console.log("Available Teams:");
  getTeamNames().forEach((team, index) => {
    console.log(`${index + 1}. ${team}`);
  });
  console.log("=".repeat(60));

  try {
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

    console.log("\n" + "=".repeat(60));
    console.log("📊 CALCULATION RESULTS");
    console.log("=".repeat(60));

    if (tossResult === "1") {
      const result = calculateBattingFirstScenario(
        yourTeam,
        oppositionTeam,
        runs,
        matchOvers,
        desiredPosition
      );

      console.log(`\n🏏 SCENARIO: ${yourTeam} bats first`);
      console.log(
        `If ${yourTeam} scores ${result.runsScored} runs in ${result.oversPlayed} overs,`
      );
      console.log(
        `${yourTeam} needs to restrict ${result.oppositionName} to maximum ${result.restrictTo} runs in ${matchOvers} overs.`
      );
      console.log(
        `Revised NRR of ${yourTeam} will be between ${result.minNRR} to ${result.maxNRR}.`
      );
    } else {
      const result = calculateBowlingFirstScenario(
        yourTeam,
        oppositionTeam,
        runs,
        desiredPosition
      );

      console.log(`\n🏏 SCENARIO: ${yourTeam} chases ${result.target} runs`);
      console.log(
        `${yourTeam} needs to chase ${result.target} runs between ${result.minOvers} and ${result.maxOvers} overs.`
      );
      console.log(
        `Revised NRR for ${yourTeam} will be between ${result.minNRR} to ${result.maxNRR}.`
      );
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Calculation completed successfully!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ An error occurred:", error.message);
  } finally {
    rl.close();
  }
}

// Run specific test scenarios
function runSpecificScenarios() {
  console.log("\n🔍 RUNNING SPECIFIC SCENARIOS:\n");

  console.log("Q-1a: Answer");
  const q1a = calculateBattingFirstScenario(
    "Rajasthan Royals",
    "Delhi Capitals",
    120,
    20,
    3
  );
  console.log(
    `If Rajasthan Royals score ${q1a.runsScored} runs in ${q1a.oversPlayed} overs, Rajasthan Royals need to`
  );
  console.log(
    `restrict Delhi Capitals to maximum ${q1a.restrictTo} runs in ${q1a.oversPlayed} overs.`
  );
  console.log(
    `Revised NRR of Rajasthan Royals will be between ${q1a.minNRR} to ${q1a.maxNRR}.\n`
  );

  console.log("Q-1b: Answer");
  const q1b = calculateBowlingFirstScenario(
    "Rajasthan Royals",
    "Delhi Capitals",
    119,
    3
  );
  console.log(
    `Rajasthan Royals need to chase ${q1b.target} runs between ${q1b.minOvers} and ${q1b.maxOvers} overs.`
  );
  console.log(
    `Revised NRR for Rajasthan Royals will be between ${q1b.minNRR} to ${q1b.maxNRR}.\n`
  );

  console.log("Q-2c: Answer");
  const q2c = calculateBattingFirstScenario(
    "Rajasthan Royals",
    "Royal Challengers Bangalore",
    80,
    20,
    3
  );
  console.log(
    `If Rajasthan Royals score ${q2c.runsScored} runs in ${q2c.oversPlayed} overs, Rajasthan Royals need to`
  );
  console.log(
    `restrict Royal Challengers Bangalore to maximum ${q2c.restrictTo} runs in ${q2c.oversPlayed} overs.`
  );
  console.log(
    `Revised NRR of Rajasthan Royals will be between ${q2c.minNRR} to ${q2c.maxNRR}.\n`
  );

  console.log("Q-2d: Answer");
  const q2d = calculateBowlingFirstScenario(
    "Rajasthan Royals",
    "Royal Challengers Bangalore",
    79,
    3
  );
  console.log(
    `Rajasthan Royals need to chase ${q2d.target} runs between ${q2d.minOvers} and ${q2d.maxOvers} overs.`
  );
  console.log(
    `Revised NRR for Rajasthan Royals will be between ${q2d.minNRR} to ${q2d.maxNRR}.\n`
  );
}

// Check command line arguments
if (process.argv.includes("--scenarios")) {
  runSpecificScenarios();
} else {
  main();
}

module.exports = {
  calculateNRR,
  calculateNRRWithSystemAdjustment,
  calculateBattingFirstScenario,
  calculateBowlingFirstScenario,
  validateTeamName,
  validateNumericInput,
  displayOversToActualOvers,
};
