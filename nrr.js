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

// Calculate dynamic NRR adjustments based on match context
function calculateDynamicNRRAdjustment(
  runsFor,
  oversFor,
  runsAgainst,
  oversAgainst,
  matchContext = {}
) {
  const basicNRR = calculateNRR(runsFor, oversFor, runsAgainst, oversAgainst);

  // Extract context parameters with defaults
  const {
    target = Math.max(runsFor, runsAgainst),
    matchOvers = 20,
    scenario = "standard",
    teamConsistency = "average", // "high", "average", "low"
  } = matchContext;

  // Base variance factors
  let baseVariance = 0.005; // Much smaller base than original arbitrary values

  // Adjust variance based on target size
  if (target <= 100) {
    baseVariance *= 0.7; // Smaller targets = less variance
  } else if (target <= 150) {
    baseVariance *= 1.0; // Standard variance
  } else if (target <= 200) {
    baseVariance *= 1.3; // Larger targets = more variance
  } else {
    baseVariance *= 1.6; // Very large targets = highest variance
  }

  // Adjust for match format
  if (matchOvers <= 10) {
    baseVariance *= 1.8; // T10 = high variance
  } else if (matchOvers <= 20) {
    baseVariance *= 1.0; // T20 = standard
  } else {
    baseVariance *= 0.6; // Longer formats = lower variance
  }

  // Adjust for team consistency
  const consistencyMultiplier = {
    high: 0.5, // Consistent teams have lower variance
    average: 1.0, // Standard variance
    low: 1.5, // Inconsistent teams have higher variance
  };
  baseVariance *= consistencyMultiplier[teamConsistency] || 1.0;

  // Calculate scenario-specific adjustments
  let adjustment = 0;
  if (scenario === "min") {
    // Pessimistic scenario: slight negative adjustment
    adjustment = -baseVariance * 2;
  } else if (scenario === "max") {
    // Optimistic scenario: slight positive adjustment
    adjustment = baseVariance * 1.5;
  } else if (scenario === "realistic") {
    // Most likely scenario: minimal adjustment
    adjustment = -baseVariance * 0.5;
  }
  // "standard" gets no adjustment (0)

  return {
    basicNRR: basicNRR,
    adjustment: adjustment,
    finalNRR: basicNRR + adjustment,
    variance: baseVariance,
    reasoning: generateAdjustmentReasoning(
      target,
      matchOvers,
      teamConsistency,
      baseVariance,
      scenario
    ),
  };
}

// Generate explanation for why adjustments were made
function generateAdjustmentReasoning(
  target,
  matchOvers,
  teamConsistency,
  variance,
  scenario
) {
  let reasons = [];

  if (target <= 100) {
    reasons.push("Small target reduces NRR calculation variance");
  } else if (target >= 200) {
    reasons.push("Large target increases potential NRR variance");
  }

  if (matchOvers <= 10) {
    reasons.push("Short format increases result unpredictability");
  } else if (matchOvers >= 30) {
    reasons.push("Longer format provides more stable NRR calculations");
  }

  if (teamConsistency === "high") {
    reasons.push("Consistent team performance reduces variance");
  } else if (teamConsistency === "low") {
    reasons.push("Inconsistent team history increases uncertainty");
  }

  reasons.push(
    `${scenario} scenario applied with ${(variance * 1000).toFixed(
      1
    )}‰ base variance`
  );

  return reasons;
}

// Legacy function for backward compatibility
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

// NEW: Dynamic over range calculation based on target and situation
function calculateDynamicOversRange(
  target,
  desiredPosition,
  currentNRR,
  teamStats
) {
  let minOvers, maxOvers;

  // Base ranges based on target size
  if (target <= 80) {
    minOvers = 2.0; // Very small targets can be chased very quickly
    maxOvers = 12.0;
  } else if (target <= 120) {
    minOvers = 3.0;
    maxOvers = 15.0;
  } else if (target <= 160) {
    minOvers = 5.0;
    maxOvers = 17.0;
  } else if (target <= 200) {
    minOvers = 8.0;
    maxOvers = 18.5;
  } else {
    minOvers = 12.0; // Large targets need more time
    maxOvers = 19.5;
  }

  // Adjust based on desired position urgency
  const positionUrgency = {
    1: 2.5, // Need top position - very aggressive
    2: 1.5, // Need good position - aggressive
    3: 0.5, // Moderate position - slightly aggressive
    4: 0, // Lower position - no adjustment
    5: -1.0, // Just avoid last - can be conservative
  };

  const urgencyAdjustment = positionUrgency[desiredPosition] || 0;
  maxOvers -= urgencyAdjustment;

  // Adjust based on current NRR situation
  if (currentNRR < -1.0) {
    // Very poor NRR - need aggressive improvement
    maxOvers -= 1.5;
    minOvers = Math.max(minOvers - 0.5, 1.5);
  } else if (currentNRR < 0) {
    // Poor NRR - need some improvement
    maxOvers -= 1.0;
  } else if (currentNRR > 0.5) {
    // Good NRR - can be slightly conservative
    maxOvers += 0.5;
    minOvers += 0.3;
  }

  // Calculate realistic run rate requirements
  const minRunRate = target / maxOvers;
  const maxRunRate = target / minOvers;

  // Ensure realistic boundaries
  minOvers = Math.max(minOvers, 1.5); // At least 1.5 overs
  maxOvers = Math.min(maxOvers, 19.5); // Maximum 19.5 overs

  // Ensure minOvers < maxOvers
  if (minOvers >= maxOvers) {
    maxOvers = minOvers + 2.0;
  }

  return {
    minOvers: Math.round(minOvers * 10) / 10,
    maxOvers: Math.round(maxOvers * 10) / 10,
    minRunRate: Math.round(minRunRate * 100) / 100,
    maxRunRate: Math.round(maxRunRate * 100) / 100,
    reasoning: generateReasoning(
      target,
      desiredPosition,
      currentNRR,
      minOvers,
      maxOvers
    ),
  };
}

// Generate explanation for the calculated ranges
function generateReasoning(
  target,
  desiredPosition,
  currentNRR,
  minOvers,
  maxOvers
) {
  let reasons = [];

  // Target-based reasoning
  if (target <= 80) {
    reasons.push("Small target allows for very aggressive chasing");
  } else if (target <= 120) {
    reasons.push("Moderate target - good opportunity for NRR improvement");
  } else if (target <= 160) {
    reasons.push("Standard target - balanced approach needed");
  } else {
    reasons.push("Large target - requires careful but effective chasing");
  }

  // Position-based reasoning
  if (desiredPosition <= 2) {
    reasons.push("Top position requires aggressive chasing strategy");
  } else if (desiredPosition === 3) {
    reasons.push("Playoff position needs balanced risk-reward approach");
  } else {
    reasons.push("Lower position allows for more conservative chasing");
  }

  // NRR-based reasoning
  if (currentNRR < -1.0) {
    reasons.push("Poor current NRR demands urgent improvement");
  } else if (currentNRR < 0) {
    reasons.push("Negative NRR needs significant improvement");
  } else if (currentNRR > 0.5) {
    reasons.push("Good current NRR allows for safer approach");
  }

  return reasons;
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

// Calculate batting first scenarios (unchanged)
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

// UPDATED: Calculate bowling first scenarios with dynamic over ranges
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

  // NEW: Use dynamic over calculation instead of fixed values
  const dynamicRange = calculateDynamicOversRange(
    target,
    desiredPosition,
    team.nrr,
    team
  );

  const minOvers = dynamicRange.minOvers;
  const maxOvers = dynamicRange.maxOvers;

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
    minRunRate: dynamicRange.minRunRate.toFixed(2),
    maxRunRate: dynamicRange.maxRunRate.toFixed(2),
    minNRR: minNRR.toFixed(3),
    maxNRR: maxNRR.toFixed(3),
    reasoning: dynamicRange.reasoning,
  };
}

// Main application logic with enhanced output
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

  console.log("=".repeat(70));
  console.log("🏏IPL 2022 NET RUN RATE CALCULATOR 🏏");
  console.log("=".repeat(70));
  console.log("Available Teams:");
  getTeamNames().forEach((team, index) => {
    const nrr = pointsTable[team].nrr;
    const nrrColor = nrr > 0 ? "📈" : nrr < -0.5 ? "📉" : "📊";
    console.log(`${index + 1}. ${team} ${nrrColor} (NRR: ${nrr})`);
  });
  console.log("=".repeat(70));

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

    console.log("\n" + "=".repeat(70));
    console.log("📊 CALCULATION RESULTS");
    console.log("=".repeat(70));

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
      console.log(`📈 DYNAMICALLY ANALYSIS:`);
      console.log(
        `   • Chase between ${result.minOvers} and ${result.maxOvers} overs`
      );
      console.log(
        `   • Required run rate: ${result.minRunRate} - ${result.maxRunRate} per over`
      );
      console.log(
        `   • Projected NRR range: ${result.minNRR} to ${result.maxNRR}`
      );

      console.log(`\n🧠 STRATEGIC:`);
      result.reasoning.forEach((reason, index) => {
        console.log(`   ${index + 1}. ${reason}`);
      });
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ Enhanced calculation completed successfully!");
    console.log("=".repeat(70));
  } catch (error) {
    console.error("❌ An error occurred:", error.message);
  } finally {
    rl.close();
  }
}

// Enhanced test scenarios
function runSpecificScenarios() {
  console.log("\n🔍 RUNNING SCENARIOS:\n");

  console.log("Q-1a: Enhanced Answer");
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

  console.log("Q-1b: Enhanced Answer with Dynamic Calculation");
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
    `Required run rate: ${q1b.minRunRate} - ${q1b.maxRunRate} per over`
  );
  console.log(
    `Revised NRR for Rajasthan Royals will be between ${q1b.minNRR} to ${q1b.maxNRR}.`
  );
  console.log("Strategic Reasoning:");
  q1b.reasoning.forEach((reason, index) => {
    console.log(`  ${index + 1}. ${reason}`);
  });
  console.log();
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
  calculateDynamicOversRange,
  validateTeamName,
  validateNumericInput,
  displayOversToActualOvers,
};
