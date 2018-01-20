
const request = require('request');
const bodyParser = require('body-parser')
const RIOT_KEY = require("./api_keys.json").riot;
const BASE_URL = "https://na1.api.riotgames.com";


// === HELPERS ===

// makeUrl: Takes an endpoint (found on Riot API site) and returns the
//          url to make a request, attaching the api key
function makeUrl (endpoint) {
    return BASE_URL + endpoint + "?api_key=" + RIOT_KEY;
}

// getIdFromName: Given a summoner name, returns the summoner id
function getIdFromName(summonerName, callback) {
    let url = makeUrl(`/lol/summoner/v3/summoners/by-name/${summonerName}`);
    request(url, function (error, response, body) {
        let obj = JSON.parse(body);
        callback(obj.id);
    })
}

// romanToNumeric: Turns roman numeral to speakable numeric numbers
function romanToNumeric(roman) {
    let romanMap = { "I" : 1, "II" : 2, "III" : 3, "IV" : 4, "V" : 5};
    return romanMap[roman];
}

// winRate: Returns the winrate
function winRate (wins, losses) {
    return losses == 0? "100 percent" : parseInt(( (wins/(wins+losses))+0.005)*100) + " percent";
}


// === API === 
// function getRankedByName(summonerName, callback) {
//     getIdFromName(summonerName, (summonerId) => {
//         getPositionsById(summonerId, callback);
//     })
// }

// getPositionsById: Returns the ranked stats for a summoner
//                   Stats include Rank, Wins, Losses, Win Streak and Veteran
function getRankedById(summonerId, callback) {
    let url = makeUrl(`/lol/league/v3/positions/by-summoner/${summonerId}`);
    request(url, function (error, response, body) {
        let obj = JSON.parse(body)[0];
        //console.log("body: ",body);
        //console.log("object: ", obj);
        callback(obj);
    });
}

// getCurrentGame: Returns data on the game the summoner is currently playing
//                 Refer to currentGame.json
function getCurrentGame(summonerName, callback) {
    getIdFromName(summonerName, (summonerId) => {
        let url = makeUrl(`/lol/spectator/v3/active-games/by-summoner/${summonerId}`);
        request(url, function (error, response, body) {
            obj = JSON.parse(body);
            //console.log("body: ",body);
            //console.log("object: ", obj);
            callback(obj);
        });
    })
}

// ACTION MAP
// 

// viewTeam: Returns simplified ranked stats of summoner's allied or enemy team
//           viewAlly is a boolean
function viewTeam(summonerName, viewAlly, callback) {

    let userTeam = 100;         // 100 = Blue, 200 = Purple
    var blueTeam = [];
    var purpleTeam = [];
    var itemsProcessed = 0;    // Needed to deal with asynch issues
    getCurrentGame(summonerName, (gameData) => {
        if (gameData.participants) {

            gameData.participants.forEach( (summoner) => {
                getRankedById(summoner.summonerId, (stats) => {
                    let summonerStats;
                    // This summoner name from the group of 10 is not the user
                    if (summoner.summonerName != summonerName) {
                        if (stats) {
                            summonerStats = `${summoner.summonerName}, ${stats.tier} ${romanToNumeric(stats.rank)} , ${winRate(stats.wins, stats.losses)} win rate.`;
                        } else {
                            summonerStats = `${summoner.summonerName} is unranked`;
                        }
    
                        if (summoner.teamId == 100) {
                            blueTeam.push(summonerStats);
                        } else {
                            purpleTeam.push(summonerStats);
                        }
                    }

                    itemsProcessed++;
                    if (itemsProcessed == gameData.participants.length) {
                        if ( (blueTeam.length < purpleTeam && viewAlly) || (blueTeam.length > purpleTeam.length && !viewAlly)) {
                            callback(blueTeam.toString());
                        } else {
                            callback(purpleTeam.toString());
                        }
                    }
                })

            })
        } else {
            callback(`${summonerName} is currently not in game`);
        }
    })
}

// winStreak: Returns an array of all the players currently on a winstreak
function winStreak(user, callback) {
    let players = []
    let itemsProcessed = 0;

    getCurrentGame(user, (gameData) => {
        if (gameData.participants) {

            gameData.participants.forEach( (summoner) => {
                getRankedById(summoner.summonerId, (stats) => {
                    // This summoner name from the group of 10 is not the user
                    if (stats && stats.hotStreak) {
                        players.push(summoner.summonerName);
                    }

                    itemsProcessed++;
                    if (itemsProcessed == gameData.participants.length) {
                        if (players.length == 0) {
                            callback("No one is on a winning streak");
                        } else if (players.length == 1) {
                            callback(players.toString() + "is on a winning streak");
                        } else {
                            callback(players.toString() + "are on winning streaks");                            
                        }
                    }
                })
            })
        } else {
            callback(`${user} is currently not in game`);            
        }
    })
}

viewTeam("imaqtpie",false, (re) => {
    console.log(re);
});
// winStreak("KiNG Nidhogg", (re) => {
//     console.log(re);
// })

// winStreak(user)

//getCurrentGame("nightblue3", (val)=> console.log("[getCurrentGame] Top level:", JSON.stringify(val,null,2)));



