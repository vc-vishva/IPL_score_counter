// #!/usr/bin/env node

// const readline = require("readline");

// /**
//  * IPL 2022 Points Table Data
//  * Contains current standings with matches, wins, losses, NRR, runs for/against, and points
//  */
// const pointsTable = {
//   "Chennai Super Kings": {
//     matches: 7,
//     won: 5,
//     lost: 2,
//     nrr: 0.771,
//     runsFor: 1130,
//     runsAgainst: 1071,
//     overs: 133.1,
//     againstOvers: 138.5,
//     points: 10,
//   },
//   "Royal Challengers Bangalore": {
//     matches: 7,
//     won: 4,
//     lost: 3,
//     nrr: 0.597,
//     runsFor: 1217,
//     runsAgainst: 1066,
//     overs: 140,
//     againstOvers: 131.4,
//     points: 8,
//   },
//   "Delhi Capitals": {
//     matches: 7,
//     won: 4,
//     lost: 3,
//     nrr: 0.319,
//     runsFor: 1085,
//     runsAgainst: 1136,
//     overs: 126,
//     againstOvers: 137,
//     points: 8,
//   },
//   "Rajasthan Royals": {
//     matches: 7,
//     won: 3,
//     lost: 4,
//     nrr: 0.331,
//     runsFor: 1066,
//     runsAgainst: 1094,
//     overs: 128.2,
//     againstOvers: 137.1,
//     points: 6,
//   },
//   "Mumbai Indians": {
//     matches: 8,
//     won: 2,
//     lost: 6,
//     nrr: -1.75,
//     runsFor: 1003,
//     runsAgainst: 1134,
//     overs: 155.2,
//     againstOvers: 138.1,
//     points: 4,
//   },
// };

// /**
//  * Convert overs in decimal format (e.g., 20.3) to balls
//  * @param {number} overs - Overs in decimal format
//  * @returns {number} Total balls
//  */
// function oversToBalls(overs) {
//   const wholeOvers = Math.floor(overs);
//   const balls = Math.round((overs - wholeOvers) * 10);
//   return wholeOvers * 6 + balls;
// }

// /**
//  * Convert balls to overs in decimal format
//  * @param {number} balls - Total balls
//  * @returns {number} Overs in decimal format
//  */
// function ballsToOvers(balls) {
//   const wholeOvers = Math.floor(balls / 6);
//   const remainingBalls = balls % 6;
//   return wholeOvers + remainingBalls / 10;
// }

// /**
//  * Calculate Net Run Rate (NRR)
//  * NRR = (Total Runs Scored / Total Overs Faced) - (Total Runs Conceded / Total Overs Bowled)
//  * @param {number} runsFor - Total runs scored by the team
//  * @param {number} oversFor - Total overs faced by the team
//  * @param {number} runsAgainst - Total runs conceded by the team
//  * @param {number} oversAgainst - Total overs bowled by the team
//  * @returns {number} Net Run Rate
//  */
// function calculateNRR(runsFor, oversFor, runsAgainst, oversAgainst) {
//   const runRate = runsFor / oversFor;
//   const concededRate = runsAgainst / oversAgainst;
//   return runRate - concededRate;
// }

// /**
//  * Validate team name input
//  * @param {string} teamName - Name of the team
//  * @returns {boolean} True if valid team name
//  */
// function validateTeamName(teamName) {
//   return pointsTable.hasOwnProperty(teamName);
// }

// /**
//  * Validate numeric input
//  * @param {string} input - Input string to validate
//  * @param {number} min - Minimum allowed value
//  * @param {number} max - Maximum allowed value
//  * @returns {boolean} True if valid number within range
//  */
// function validateNumericInput(input, min = 0, max = Infinity) {
//   const num = parseFloat(input);
//   return !isNaN(num) && num >= min && num <= max;
// }

// /**
//  * Get all available team names
//  * @returns {string[]} Array of team names
//  */
// function getTeamNames() {
//   return Object.keys(pointsTable);
// }

// /**
//  * Calculate scenario when team bats first
//  * @param {string} teamName - Name of the batting team
//  * @param {string} oppositionName - Name of the opposition team
//  * @param {number} runsScored - Runs scored by batting team
//  * @param {number} oversPlayed - Overs played by batting team
//  * @param {number} desiredPosition - Desired position in points table (1-5)
//  * @returns {Object} Calculation results
//  */
// function calculateBattingFirstScenario(
//   teamName,
//   oppositionName,
//   runsScored,
//   oversPlayed,
//   desiredPosition
// ) {
//   const team = pointsTable[teamName];
//   const opposition = pointsTable[oppositionName];

//   // Current team stats after batting
//   const newRunsFor = team.runsFor + runsScored;
//   const newOversFor = ballsToOvers(
//     oversToBalls(team.overs) + oversToBalls(oversPlayed)
//   );

//   // Get target NRR based on desired position
//   const sortedTeams = Object.entries(pointsTable)
//     .sort((a, b) => b[1].nrr - a[1].nrr)
//     .map(([name, data]) => ({ name, ...data }));

//   let targetNRR;
//   if (desiredPosition === 1) {
//     targetNRR = sortedTeams[0].nrr + 0.001; // Slightly better than current #1
//   } else {
//     targetNRR = sortedTeams[desiredPosition - 1].nrr + 0.001; // Slightly better than target position
//   }

//   // Calculate required runs to restrict opposition to
//   // NRR = (RunsFor/OversFor) - (RunsAgainst/OversAgainst)
//   // targetNRR = (newRunsFor/newOversFor) - ((team.runsAgainst + oppositionRuns)/(team.againstOvers + 20))

//   const newAgainstOvers = ballsToOvers(
//     oversToBalls(team.againstOvers) + oversToBalls(20)
//   );
//   const maxOppositionRuns = Math.floor(
//     (newRunsFor / newOversFor - targetNRR) * newAgainstOvers - team.runsAgainst
//   );

//   // Calculate NRR range
//   const minNRR = calculateNRR(
//     newRunsFor,
//     newOversFor,
//     team.runsAgainst + Math.max(0, maxOppositionRuns),
//     newAgainstOvers
//   );
//   const maxNRR = calculateNRR(
//     newRunsFor,
//     newOversFor,
//     team.runsAgainst,
//     newAgainstOvers
//   );

//   return {
//     teamName,
//     oppositionName,
//     runsScored,
//     oversPlayed,
//     restrictTo: Math.max(0, maxOppositionRuns),
//     minNRR: minNRR.toFixed(3),
//     maxNRR: maxNRR.toFixed(3),
//   };
// }

// /**
//  * Calculate scenario when team bowls first
//  * @param {string} teamName - Name of the chasing team
//  * @param {string} oppositionName - Name of the opposition team
//  * @param {number} target - Target runs to chase
//  * @param {number} desiredPosition - Desired position in points table (1-5)
//  * @returns {Object} Calculation results
//  */
// function calculateBowlingFirstScenario(
//   teamName,
//   oppositionName,
//   target,
//   desiredPosition
// ) {
//   const team = pointsTable[teamName];

//   // Get target NRR
//   const sortedTeams = Object.entries(pointsTable)
//     .sort((a, b) => b[1].nrr - a[1].nrr)
//     .map(([name, data]) => ({ name, ...data }));

//   let targetNRR;
//   if (desiredPosition === 1) {
//     targetNRR = sortedTeams[0].nrr + 0.001;
//   } else {
//     targetNRR = sortedTeams[desiredPosition - 1].nrr + 0.001;
//   }

//   // Calculate required overs to chase target in
//   // targetNRR = ((team.runsFor + target)/(team.overs + requiredOvers)) - ((team.runsAgainst + oppositionScore)/(team.againstOvers + 20))

//   const newRunsAgainst = team.runsAgainst + target;
//   const newAgainstOvers = ballsToOvers(
//     oversToBalls(team.againstOvers) + oversToBalls(20)
//   );
//   const newRunsFor = team.runsFor + target;

//   // Solve for required overs: targetNRR = (newRunsFor/(team.overs + requiredOvers)) - (newRunsAgainst/newAgainstOvers)
//   const requiredRunRate = targetNRR + newRunsAgainst / newAgainstOvers;
//   const maxOversNeeded = newRunsFor / requiredRunRate - team.overs;

//   const minOvers = Math.max(1, target / 36); // Minimum realistic overs (assuming max 36 runs per over)
//   const maxOvers = Math.min(20, maxOversNeeded);

//   // Calculate NRR range
//   const minNRRCalc = calculateNRR(
//     newRunsFor,
//     ballsToOvers(oversToBalls(team.overs) + oversToBalls(minOvers)),
//     newRunsAgainst,
//     newAgainstOvers
//   );
//   const maxNRRCalc = calculateNRR(
//     newRunsFor,
//     ballsToOvers(oversToBalls(team.overs) + oversToBalls(maxOvers)),
//     newRunsAgainst,
//     newAgainstOvers
//   );

//   return {
//     teamName,
//     target,
//     minOvers: minOvers.toFixed(1),
//     maxOvers: maxOvers.toFixed(1),
//     minNRR: Math.min(minNRRCalc, maxNRRCalc).toFixed(3),
//     maxNRR: Math.max(minNRRCalc, maxNRRCalc).toFixed(3),
//   };
// }

// /**
//  * Main CLI interface
//  */
// async function main() {
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });

//   // Helper function to ask questions
//   const askQuestion = (question) => {
//     return new Promise((resolve) => {
//       rl.question(question, resolve);
//     });
//   };

//   console.log("=".repeat(60));
//   console.log("🏏 IPL 2022 NET RUN RATE CALCULATOR 🏏");
//   console.log("=".repeat(60));
//   console.log("Available Teams:");
//   getTeamNames().forEach((team, index) => {
//     console.log(`${index + 1}. ${team}`);
//   });
//   console.log("=".repeat(60));

//   try {
//     // Get user inputs with validation
//     let yourTeam;
//     do {
//       yourTeam = await askQuestion("Enter Your Team Name: ");
//       if (!validateTeamName(yourTeam)) {
//         console.log("❌ Invalid team name. Please choose from the list above.");
//       }
//     } while (!validateTeamName(yourTeam));

//     let oppositionTeam;
//     do {
//       oppositionTeam = await askQuestion("Enter Opposition Team Name: ");
//       if (!validateTeamName(oppositionTeam)) {
//         console.log("❌ Invalid team name. Please choose from the list above.");
//       } else if (oppositionTeam === yourTeam) {
//         console.log("❌ Opposition team cannot be the same as your team.");
//         oppositionTeam = "";
//       }
//     } while (!validateTeamName(oppositionTeam) || oppositionTeam === yourTeam);

//     let matchOvers;
//     do {
//       const oversInput = await askQuestion(
//         "How many overs match? (e.g., 20): "
//       );
//       if (!validateNumericInput(oversInput, 1, 50)) {
//         console.log("❌ Please enter a valid number of overs (1-50).");
//       } else {
//         matchOvers = parseFloat(oversInput);
//       }
//     } while (!matchOvers);

//     let desiredPosition;
//     do {
//       const positionInput = await askQuestion(
//         "Desired Position for Your Team in Points Table (1-5): "
//       );
//       if (
//         !validateNumericInput(positionInput, 1, 5) ||
//         !Number.isInteger(parseFloat(positionInput))
//       ) {
//         console.log("❌ Please enter a valid position (1-5).");
//       } else {
//         desiredPosition = parseInt(positionInput);
//       }
//     } while (!desiredPosition);

//     let tossResult;
//     do {
//       tossResult = await askQuestion(
//         "Toss Result (1: Batting First, 2: Bowling First): "
//       );
//       if (!["1", "2"].includes(tossResult)) {
//         console.log(
//           "❌ Please enter 1 for Batting First or 2 for Bowling First."
//         );
//       }
//     } while (!["1", "2"].includes(tossResult));

//     let runs;
//     if (tossResult === "1") {
//       // Batting first - get runs scored
//       do {
//         const runsInput = await askQuestion("Runs Scored: ");
//         if (!validateNumericInput(runsInput, 0, 500)) {
//           console.log("❌ Please enter a valid number of runs (0-500).");
//         } else {
//           runs = parseInt(runsInput);
//         }
//       } while (runs === undefined);
//     } else {
//       // Bowling first - get target to chase
//       do {
//         const runsInput = await askQuestion("Runs to Chase: ");
//         if (!validateNumericInput(runsInput, 1, 500)) {
//           console.log(
//             "❌ Please enter a valid number of runs to chase (1-500)."
//           );
//         } else {
//           runs = parseInt(runsInput);
//         }
//       } while (runs === undefined);
//     }

//     console.log("\n" + "=".repeat(60));
//     console.log("📊 CALCULATION RESULTS");
//     console.log("=".repeat(60));

//     if (tossResult === "1") {
//       // Calculate batting first scenario
//       const result = calculateBattingFirstScenario(
//         yourTeam,
//         oppositionTeam,
//         runs,
//         matchOvers,
//         desiredPosition
//       );

//       console.log(`\n🏏 SCENARIO: ${yourTeam} bats first`);
//       console.log(
//         `If ${yourTeam} scores ${result.runsScored} runs in ${result.oversPlayed} overs,`
//       );
//       console.log(
//         `${yourTeam} needs to restrict ${result.oppositionName} to maximum ${result.restrictTo} runs in ${matchOvers} overs.`
//       );
//       console.log(
//         `Revised NRR of ${yourTeam} will be between ${result.minNRR} to ${result.maxNRR}.`
//       );
//     } else {
//       // Calculate bowling first scenario
//       const result = calculateBowlingFirstScenario(
//         yourTeam,
//         oppositionTeam,
//         runs,
//         desiredPosition
//       );

//       console.log(`\n🏏 SCENARIO: ${yourTeam} chases ${result.target} runs`);
//       console.log(
//         `${yourTeam} needs to chase ${result.target} runs between ${result.minOvers} and ${result.maxOvers} overs.`
//       );
//       console.log(
//         `Revised NRR for ${yourTeam} will be between ${result.minNRR} to ${result.maxNRR}.`
//       );
//     }

//     console.log("\n" + "=".repeat(60));
//     console.log("✅ Calculation completed successfully!");
//     console.log("=".repeat(60));
//   } catch (error) {
//     console.error("❌ An error occurred:", error.message);
//   } finally {
//     rl.close();
//   }
// }

// // Handle specific scenarios mentioned in the requirements
// function runSpecificScenarios() {
//   console.log("\n🔍 RUNNING SPECIFIC SCENARIOS FROM REQUIREMENTS:\n");

//   // Q-1a: Rajasthan Royals vs Delhi Capitals (RR bats first, scores 120 in 20 overs)
//   console.log("Q-1a: Rajasthan Royals vs Delhi Capitals");
//   const q1a = calculateBattingFirstScenario(
//     "Rajasthan Royals",
//     "Delhi Capitals",
//     120,
//     20,
//     3
//   );
//   console.log(
//     `If Rajasthan Royals score ${q1a.runsScored} runs in ${q1a.oversPlayed} overs, Rajasthan Royals need to restrict Delhi Capitals to maximum ${q1a.restrictTo} runs in 20 overs.`
//   );
//   console.log(
//     `Revised NRR of Rajasthan Royals will be between ${q1a.minNRR} to ${q1a.maxNRR}.\n`
//   );

//   // Q-1b: Delhi Capitals vs Rajasthan Royals (DC bats first, scores 119 in 20 overs)
//   console.log("Q-1b: Delhi Capitals vs Rajasthan Royals");
//   const q1b = calculateBowlingFirstScenario(
//     "Rajasthan Royals",
//     "Delhi Capitals",
//     119,
//     3
//   );
//   console.log(
//     `Rajasthan Royals need to chase ${q1b.target} runs between ${q1b.minOvers} and ${q1b.maxOvers} overs.`
//   );
//   console.log(
//     `Revised NRR for Rajasthan Royals will be between ${q1b.minNRR} to ${q1b.maxNRR}.\n`
//   );

//   // Q-2c: Rajasthan Royals vs Royal Challengers Bangalore (RR bats first, scores 80 in 20 overs)
//   console.log("Q-2c: Rajasthan Royals vs Royal Challengers Bangalore");
//   const q2c = calculateBattingFirstScenario(
//     "Rajasthan Royals",
//     "Royal Challengers Bangalore",
//     80,
//     20,
//     3
//   );
//   console.log(
//     `If Rajasthan Royals score ${q2c.runsScored} runs in ${q2c.oversPlayed} overs, Rajasthan Royals need to restrict Royal Challengers Bangalore to maximum ${q2c.restrictTo} runs in 20 overs.`
//   );
//   console.log(
//     `Revised NRR of Rajasthan Royals will be between ${q2c.minNRR} to ${q2c.maxNRR}.\n`
//   );

//   // Q-2d: Royal Challengers Bangalore vs Rajasthan Royals (RCB bats first, scores 79 in 20 overs)
//   console.log("Q-2d: Royal Challengers Bangalore vs Rajasthan Royals");
//   const q2d = calculateBowlingFirstScenario(
//     "Rajasthan Royals",
//     "Royal Challengers Bangalore",
//     79,
//     3
//   );
//   console.log(
//     `Rajasthan Royals need to chase ${q2d.target} runs between ${q2d.minOvers} and ${q2d.maxOvers} overs.`
//   );
//   console.log(
//     `Revised NRR for Rajasthan Royals will be between ${q2d.minNRR} to ${q2d.maxNRR}.\n`
//   );
// }

// // Check if running specific scenarios or interactive mode
// if (process.argv.includes("--scenarios")) {
//   runSpecificScenarios();
// } else {
//   // Run interactive CLI
//   main();
// }

// module.exports = {
//   calculateNRR,
//   calculateBattingFirstScenario,
//   calculateBowlingFirstScenario,
//   validateTeamName,
//   validateNumericInput,
//   oversToBalls,
//   ballsToOvers,
// };
