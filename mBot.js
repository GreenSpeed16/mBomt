const tmi = require('tmi.js');
const fs = require('fs');
require('dotenv').config();

const vowels = [
    'A',
    'E',
    'I',
    'O',
    'U',
];
const botName = 'MBOMT';
var disabledChannels = [];

//Make sure no serious messages get m'd
const maxMessageLength = 15;
var messagesInChat = 0;

//Individual channel settings
var channelMessageCounts = new Map();
var channels = [];
var channelMessageCountsObj;

//Get JSON info
var data = fs.readFileSync('streamerInfo.json', (err, data) => {});
channelMessageCountsObj = JSON.parse(data);
//Populate map
for( let nextKey in channelMessageCountsObj ){
    channels.push(nextKey);
    let nextVal = channelMessageCountsObj[nextKey];
    channelMessageCounts.set(nextKey, nextVal);
}
console.log(channels);

function UpdateStreamerJson(){
    fs.writeFile('streamerInfo.json', JSON.stringify(channelMessageCountsObj), 'utf8', (err) => {
        if (err) {
            console.log(`Error writing file: ${err}`);
        } else {
            console.log(`File is written successfully!`);
        }
    
    });
}

UpdateStreamerJson();

const options = {
    options: {
        debug: true,
    },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: process.env.USERNAME,
        password: process.env.PASSWORD//'oauth:k2ez7i6kfbe56vd4in5ipjj5q09b5p',
    },
    channels: channels,
};
const client = new tmi.client(options);
client.connect();

function getRndInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Chat reactions
client.on('message', (channel, user, message, self) => {

    function sendMessage(messageWords, mIndex, mWord){
        var messageString = '';
        for(var i = 0; i < messageWords.length; i++){
            if(i == mIndex){
                messageString += (' ' + mWord);
            }
            else{
                messageString += (' ' + messageWords[i]);
            }
        }
    
        messagesInChat = 0;
        client.action(channel, messageString);
    }

    function mBetweenVowelAndConsenant(index, wordToM){
        mWord = wordToM.slice(0, index) + 'm' + wordToM.slice(index);
        sendMessage(messageWords, wordIndex, mWord);
    }

    function mAfterConsenant(index, wordToM){
        var mWord = wordToM.slice(0, index + 1) + 'm' + wordToM.slice(index + 1);
        sendMessage(messageWords, wordIndex, mWord);
    }

    if(!(user.username.toUpperCase() == botName) && !(message[0] == '!')) {
        messagesInChat++;
        console.log('Messages: ' + messagesInChat);
    }

    //Disable
    if(message === '!disamble' && (user['user-type'] === 'mod' || user.username === channel.replace('#', ''))) {
        disabledChannels.push(channel);
        client.say(channel, 'mBomt disabled, use !enamble to reactivate');
        console.log(disabledChannels);
    }
    //Enable
    else if(message === '!enamble' && (user['user-type'] === 'mod' || user.username === channel.replace('#', ''))) {
        disabledChannels.splice(disabledChannels.indexOf(channel), 1);
        client.say(channel, 'mBomt enabled!');
        console.log(disabledChannels);
    }
    //M's
    else if(!disabledChannels.includes(channel) && message[0] != '!') {
        var mWord;
        if(messagesInChat >= channelMessageCounts.get(channel.replace('#', ''))){
            //Split message into individual words
            var messageWords = message.split(" ");

            if(messageWords.Length > maxMessageLength){
                return;
            }
            var wordIndex = getRndInt(0, (messageWords.length - 1));
            console.log(wordIndex);
            var wordToM = messageWords[wordIndex];
            console.log(wordToM);

            var isVowel;
            var wasLastCharacterVowel;
            for(var i = 0; i < wordToM.length; i++){
                //Only add an m after consecutive vowel then consenant
                wasLastCharacterVowel = isVowel;            

                //Check that current character is a vowel
                if(vowels.includes(wordToM[i].toUpperCase())){
                    isVowel = true;
                }
                else{
                    isVowel = false;
                }
                //If current character is not a vowel and old character was, run logic
                if(wasLastCharacterVowel && !isVowel){
                    //Reset message count
                    messagesInChat = 0;
                    //Check iff next character is consenant and final character in string
                    if(i + 1 == wordToM.length - 1 && !vowels.includes(wordToM[i + 1].toUpperCase())){
                        mAfterConsenant(i, wordToM);
                        break;
                    }
                    else{
                        mBetweenVowelAndConsenant(i, wordToM);
                        break;
                    }
                }
                
            }
        }
    }
    //Change M Frequency
    else if(message.split(' ')[0] == '!mfrequency' && (user['user-type'] == 'mod' || user.username == channel.replace('#', ''))){
        var newFrequency = parseInt(message.split(' ')[1]);
        channelMessageCounts.set(channel.replace('#', ''), newFrequency);
        channelMessageCountsObj[channel.replace('#', '')] = newFrequency;
        UpdateStreamerJson();
        console.log(channelMessageCounts);
        client.say(channel, 'M frequency changed to every ' + newFrequency + ' messages');
    }
});
