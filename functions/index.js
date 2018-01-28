// Dependencies
process.env.DEBUG   = 'actions-on-google:*';
const DialogflowApp = require('actions-on-google').DialogflowApp;
const functions     = require('firebase-functions');
const request       = require('request');
const RIOT_KEY      = require("./api_key.json").riot;
const BASE_URL      = "https://na1.api.riotgames.com";


exports.sillyNameMaker = functions.https.onRequest((req, response) => {
    const app = new DialogflowApp({request: req, response: response});
    console.log('Request headers: ' + JSON.stringify(req.headers));
    console.log('Request body: ' + JSON.stringify(req.body));

    // Hardcode user
    app.data.summoner = {
        "profileIconId": 3006,
        "name": "XSkills",
        "summonerLevel": 33,
        "accountId": 36106782,
        "id": 22358151,
        "revisionDate": 1513496761000
    }

    app.data.summoner = {
        "profileIconId": 1376,
        "name": "Awaykened",
        "summonerLevel": 56,
        "accountId": 207836204,
        "id": 45070516,
        "revisionDate": 1516586909000
    }

    // ===============
    // === HELPERS ===
    // ===============

    // makeUrl: Takes an endpoint (found on Riot API site) and returns the
    //          url to make a request, attaching the api key
    function makeUrl (endpoint) {
        return BASE_URL + endpoint + "?api_key=" + RIOT_KEY;
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

    // getChampionName: Returns the name of the champion with the given id to the callback
    function getChampionName(id, callback) {
        let url = makeUrl(`/lol/static-data/v3/champions/${id}`);
        request({url: url}, function (error, response, body) {
            let obj = JSON.parse(body);
            callback(obj.name);
        });
    }

    // ===============
    // === ACTIONS ===
    // ===============
    
    // setName: Action to be triggered after welcome intent to set the summoner name
    function setName(app) {
        let summonerName = app.getArgument("name");
        let url = makeUrl("/lol/summoner/v3/summoners/by-name/" + summonerName);         

        request(url, (error, response, body) => {
            let obj = JSON.parse(body);
            app.ask("Hello " + obj.name);
            app.data.summoner = obj;
            app.ask({speech: `Now working with ${app.data.summoner.name}`,
                     displayText: `Current summoner is set to ${app.data.summoner.name}`});
        });
    }

    // getSummonerId: Outputs the user's summoner id;
    function getSummonerId(app) {
        app.ask(`Your summoner ID is: ${app.data.summoner.id}`);
    }

    // getAcountId: Outputs the user's account id;    
    function getAccountId(app) {
        app.ask(`Your account ID is: ${app.data.summoner.accountId}`);
    }

    // getLevel: Outputs the user's level
    function getLevel(app) {
        app.ask(`Your current summoner level is: ${app.data.summoner.summonerLevel}`);
    }

    // getRank: Outputs the user's rank
    function getRank(app) {
        let url = makeUrl(`/lol/league/v3/positions/by-summoner/${app.data.summoner.id}`);
        request(url, function (error, response, body) {
            try {
                let obj = JSON.parse(body)[0];
                app.ask(`Your rank is ${obj.tier + " " + romanToNumeric(obj.rank)}`);
            } catch (e) {
                app.ask("You are unranked!");
            }
        });
    }

    // getRankedStats: Outputs the user's ranked stats,
    //                 i.e. Rank, winrate, winstreak status and veteran status
    function getRankedStats(app) {
        let url = makeUrl(`/lol/league/v3/positions/by-summoner/${app.data.summoner.id}`);
        request(url, function (error, response, body) {
            try {
                let obj = JSON.parse(body);
                let outputText = `You are ranked ${obj.tier} ${romanToNumeric(obj.rank)} with a 
                                ${winrate(obj.wins, obj.losses)} win rate`;
                app.ask(outputText);   
            } catch (e) {
                app.ask("You are unranked!!");
            }
        });
    }

    // getMastery: Returns the champion that the user has the highest mastery for
    function getMastery() {
        let url = makeUrl(`/lol/champion-mastery/v3/champion-masteries/by-summoner/${summoner.id}`);
        request(url, (error, response, body) => {
            let obj = JSON.parse(body)[0];
            getChampionName(obj.championId, (championName) => {
                console.log(`Your highest mastery is with ${championName} at ${obj.championPoints} points`);
            }); 
        });
    }

    // getPartialStats: Given a summonerId, returns the player's rank and winrate to a callback
    function getPartialStats(summonerId, callback) {
        let url = makeUrl(`/lol/league/v3/positions/by-summoner/${summonerId}`);
        request(url, (error, response, body) => {
            let obj = JSON.parse(body)[0];
            if (!obj) {
                callback("Unranked");
            }
            //console.log(obj);
            callback(`${obj.tier} ${romanToNumeric(obj.rank)}, Win rate: ${winRate(obj.wins, obj.losses)}`);
        })
    }

    // getCurrentGame: Returns data on the game the summoner is currently playing
    //                 Refer to currentGame.json
    function getCurrentMatch(app) {

        let url = makeUrl(`/lol/spectator/v3/active-games/by-summoner/${app.data.summoner.id}`);
        request(url, function (error, response, body) {
            obj = JSON.parse(body);
            if (!obj.participants) {
                app.ask(`${app.data.summoner.name} is not currently in game!`);
            } else {
                callback(obj);
            }
        });
    }

    // viewOwnTeam: Returns the ranks and win rate of the user's team
    function viewOwnTeam(app) {
        let url = makeUrl(`/lol/spectator/v3/active-games/by-summoner/${summoner.id}`);
        let count = 0;
        request(url, function (error, response, body) {
            obj = JSON.parse(body);
            if (!obj.participants) {
                app.ask("You are not in game!!");
            } else {
                let team = [];
                obj.participants.forEach((player) => {
                    if (player.summonerName == summoner.name) {
                        myTeam = player.teamId;
                        obj.participants.forEach((player) => {
                            if (player.teamId === myTeam && player.summonerName != summoner.name) {
                                getPartialStats(player.summonerId, (stats) => {
                                    team.push(`${player.summonerName}, ${stats}`);
                                    count++;
                                    if (count == (obj.participants.length/2)-1) {
                                        app.ask(`You are playing with \n${team.join('.\n')} `);
                                    }
                                })
                            }
                        });
                    }
                });
            }
        });
    }

    // viewEnemyTeam: Returns the ranks and win rate of the enemy's team
    function viewEnemyTeam(app) {
        let url = makeUrl(`/lol/spectator/v3/active-games/by-summoner/${summoner.id}`);
        let count = 0;
        request(url, function (error, response, body) {
            obj = JSON.parse(body);
            if (!obj.participants) {
                console.log("You are not in game!!");
            } else {
                let team = [];
                obj.participants.forEach((player) => {
                    if (player.summonerName == summoner.name) {
                        theirTeam = (player.teamId*2)%300;
                        obj.participants.forEach((player) => {
                            if (player.teamId === theirTeam && s.summonerName != summoner.name) {
                                getPartialStats(s.summonerId, (stats) => {
                                    team.push(`${player.summonerName}, ${stats}`);
                                    count++;
                                    if (count == (obj.participants.length/2)) {
                                        console.log(`You are playing against \n${team.join('.\n')} `);
                                    }
                                })
                            }
                        });
                    }
                });
            }
        });
    }

    let actionMap = new Map();
    actionMap.set("SET_NAME", setName);
    actionMap.set("GET_SUMMONER_ID", getSummonerId);
    actionMap.set("GET_ACCOUNT_ID", getAccountId)
    actionMap.set("GET_LEVEL", getLevel);
    actionMap.set("GET_RANK", getRank);
    actionMap.set("GET_RANKED_STATS", getRankedStats);
    actionMap.set("GET_MASTERY", getMastery);
    actionMap.set("GET_ALLY_TEAM", viewOwnTeam);
    actionMap.set("GET_ENEMY_TEAM", viewEnemyTeam);
    actionMap.set("GET_LAST_MATCH", getLastMatch);

    app.handleRequest(actionMap);
});
