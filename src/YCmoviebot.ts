/**
 * Copyright (c) Microsoft Corporation. All rights reserved.  
 * Licensed under the MIT License.
 */
import * as path from 'path'
import * as express from 'express'
import { BotFrameworkAdapter } from 'botbuilder'
import { ConversationLearner, ClientMemoryManager, FileStorage } from '@conversationlearner/sdk'
import config from './config'
import startDol from './dol'
import * as sql from "seriate"

//===================
// Create Bot server
//===================
const server = express()

const isDevelopment = process.env.NODE_ENV === 'development'
if (isDevelopment) {
    startDol(server, config.botPort)
}
else {
    const listener = server.listen(config.botPort, () => {
        console.log(`Server listening to ${listener.address().port}`)
    })
}

const { bfAppId, bfAppPassword, modelId, ...clOptions } = config

//==================
// Create Adapter
//==================
const adapter = new BotFrameworkAdapter({ appId: bfAppId, appPassword: bfAppPassword });

//==================================
// Storage 
//==================================
// Initialize ConversationLearner using file storage.  
// Recommended only for development
// See "storageDemo.ts" for other storage options
let fileStorage = new FileStorage(path.join(__dirname, 'storage'))

//==================================
// Initialize Conversation Learner
//==================================
const sdkRouter = ConversationLearner.Init(clOptions, fileStorage)
if (isDevelopment) {
    server.use('/sdk', sdkRouter)
}
let cl = new ConversationLearner(modelId);

//=================================
// Add Entity Logic
//=================================
/**
* Processes messages received from the user. Called by the dialog system. 
* @param {string} text Last user input to the Bot
* @param {ClientMemoryManager} memoryManager Allows for viewing and manipulating Bot's memory
* @returns {Promise<void>}
*/
cl.EntityDetectionCallback(async (text: string, memoryManager: ClientMemoryManager): Promise<void> => {

    // Get list of (possibly) entities which need text normalization
    var entitiesCount: number = 0;
    var city:any[] = [null];
    var date:any[] = [null];
    var moviename:any[] = [null];
    var theater:any[] = [null];
    var starttime:any[] = [null];
    var genre:any[] = [null];
    var format = null;
    var cities:any[] = [];
    var dates:any[] = [];
    var movienames:any[] = [];
    var theaters:any[] = [];
    var starttimes:any[] = [];
    var genres:any[] = [];
    var formats:any[] = [];
    var offsets:any[] = [];

    var formatFromUser = await memoryManager.EntityValueAsList("videoformat");
    if (formatFromUser.length > 0) {
        format = formatFromUser[0].toLowerCase();
        if (format.includes('standard') || format.includes('2d'))
            format = 'standard/2D version';
        else format = '3D version';
        memoryManager.ForgetEntity("videoformat");
        memoryManager.RememberEntity("videoformat", format);
        entitiesCount += 1;
    }
    var cityFromUser =                                                                                                                                                                                                                                              await memoryManager.EntityValueAsList("city");
    if (cityFromUser.length > 0) {
        city = cityFromUser;
        entitiesCount += 1;
    }
    var movienameFromUser = await memoryManager.EntityValueAsList("moviename");
    if (movienameFromUser.length > 0) {
        moviename = movienameFromUser;
        entitiesCount += 1;
    }
    var dateFromUser = await memoryManager.EntityValueAsList("date");
    if (dateFromUser.length > 0) {
        date = dateFromUser;
        entitiesCount += 1;
    }
    var theaterFromUser = await memoryManager.EntityValueAsList("theater");
    if (theaterFromUser.length > 0) {
        theater = theaterFromUser;
        entitiesCount += 1;
    }
    var genreFromUser = await memoryManager.EntityValueAsList("genre");
    if (genreFromUser.length > 0) {
        genre = genreFromUser;
        entitiesCount += 1;
    }
    var starttimeFromUser = await memoryManager.EntityValueAsList("starttime");
    if (starttimeFromUser.length > 0) {
        starttime = starttimeFromUser;
        entitiesCount += 1;
    }
    if (entitiesCount > 1)
    {
        var dbConfig = {
            "server": "localhost",
            "user": "MovieBot",
            "password": "We're#1.",
            "database": "MovieDomain"
        };
        memoryManager.ForgetEntity("cityProgram");
        memoryManager.ForgetEntity("dateProgram");
        memoryManager.ForgetEntity("theaterProgram");
        memoryManager.ForgetEntity("starttimeProgram");
        memoryManager.ForgetEntity("genreProgram");
        memoryManager.ForgetEntity("videoformatProgram");
        memoryManager.ForgetEntity("movienameProgram");
        memoryManager.ForgetEntity("exactmatchfoundProgram");
        memoryManager.ForgetEntity("cityProgramMoreThan1");
        memoryManager.ForgetEntity("dateProgramMoreThan1");
        memoryManager.ForgetEntity("theaterProgramMoreThan1");
        memoryManager.ForgetEntity("starttimeProgramMoreThan1");
        memoryManager.ForgetEntity("genreProgramMoreThan1");
        memoryManager.ForgetEntity("videoformatProgramMoreThan1");
        memoryManager.ForgetEntity("movienameProgramMoreThan1");
        for (let c of city)
           for (let d of date)
              for (let g of genre)
                 for (let m of moviename)
                    for (let t of theater)
                       for (let s of starttime)
        {
            sql.setDefaultConfig( dbConfig );
            let results = await sql.execute( 
                {
                    procedure: "SPRetrieveCandidates",
                    params: {
                        City: { type: sql.varchar, val: c },
                        Date: { type: sql.varchar, val: d },
                        Genre: { type: sql.varchar, val: g },
                        MovieName: { type: sql.varchar, val:m },
                        Theater: { type: sql.varchar, val: t },
                        VideoFormat: { type: sql.varchar, val: format },                    
                        Referencetime: { type: sql.varchar, val: s }
                    }
                });
            let datarows: {StartTime:string, Offset:number, City: string, Date:string,
                Genre:string, MovieName:string, Theater:string, Video_format:string}[] = results[0][0];
            cities = cities.concat(datarows.map(r => r["City"]).filter(a => a != null));
            dates = dates.concat(datarows.map(r => r["Date"]).filter(a => a != null));
            genres = genres.concat(datarows.map(r => r["Genre"]).filter(a => a != null));
            movienames = movienames.concat(datarows.map(r => r["MovieName"]).filter(a => a != null));
            theaters = theaters.concat(datarows.map(r => r["Theater"]).filter(a => a != null));
            formats = formats.concat(datarows.map(r => r["Video_format"]).filter(a => a != null));
            starttimes = starttimes.concat(datarows.map(r => r["StartTime"]).filter(a => a != null));
            offsets = offsets.concat(datarows.map(r => r["Offset"]).filter(a => a != null));
        }
        cities = cities.filter((x,i,a) => a.indexOf(x) == i);
        for (let c of cities)
            memoryManager.RememberEntity("cityProgram", c);
        if (cities.length > 1)
            memoryManager.RememberEntity("cityProgramMoreThan1", "true");

        dates = dates.filter((x,i,a) => a.indexOf(x) == i);
        for (let d of dates)
            memoryManager.RememberEntity("dateProgram", d);
        if (dates.length > 1)
            memoryManager.RememberEntity("dateProgramMoreThan1", "true");

        theaters = theaters.filter((x,i,a) => a.indexOf(x) == i);
        for (let t of theaters)
            memoryManager.RememberEntity("theaterProgram", t);  
        if (theaters.length > 1)
            memoryManager.RememberEntity("theaterProgramMoreThan1", "true");

        starttimes = starttimes.filter((x,i,a) => a.indexOf(x) == i);
        for (let s of starttimes)
            memoryManager.RememberEntity("starttimeProgram", s);
        if (starttimes.length > 1)
            memoryManager.RememberEntity("starttimeProgramMoreThan1", "true");

        genres = genres.filter((x,i,a) => a.indexOf(x) == i);
        for (let g of genres)
            memoryManager.RememberEntity("genreProgram", g); 
        if (genres.length > 1)
            memoryManager.RememberEntity("genreProgramMoreThan1", "true");

        formats = formats.filter((x,i,a) => a.indexOf(x) == i);
        for (let v of formats)
            memoryManager.RememberEntity("videoformatProgram", v); 
        if (formats.length > 1)
            memoryManager.RememberEntity("formatProgramMoreThan1", "true");

        movienames = movienames.filter((x,i,a) => a.indexOf(x) == i);
        for (let m of movienames)
            memoryManager.RememberEntity("movienameProgram", m);
        if (movienames.length > 1)
            memoryManager.RememberEntity("movienameProgramMoreThan1", "true");   
        
        offsets = offsets.filter((x,i,a) => a.indexOf(x) == i);
        if ((offsets.length > 0) && (offsets[0] == 0))
            memoryManager.RememberEntity("exactmatchfoundProgram", "true");  
    }
})

//=================================
// Handle Incoming Messages
//=================================

server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async context => {
        let result = await cl.recognize(context)
        
        if (result) {
            cl.SendResult(result);
        }
    })
})


//=================================
// Define API callbacks
//=================================
cl.AddAPICallback("SelectTimeOption", async (memoryManager : ClientMemoryManager, preferred: string) => 
    {
        preferred = preferred.toUpperCase();
        let options = memoryManager.EntityValueAsList("starttime");
        let starttime = options.filter(n => n.includes(preferred));
        memoryManager.ForgetEntity("starttime"); 
        for (let time of starttime) {
            memoryManager.RememberEntity("starttime", time); 
         }
       return starttime + " Great";
    }
);

cl.AddAPICallback("inform(taskcomplete)", async (memoryManager : ClientMemoryManager) =>
    {
        return "I have secured those tickets for you";
    }
);

cl.AddAPICallback("inform(starttime=)", async (memoryManager : ClientMemoryManager, starttime: string) =>
    {
        return "There is a " + starttime + " showing";
    }
);

cl.AddAPICallback("inform(genre=;moviename=)", async (memoryManager : ClientMemoryManager, genre: string, moviename: string) =>
    {
        return "Some current " + genre + " are: " + moviename;
    }
);

cl.AddAPICallback("inform(moviename=)", async (memoryManager : ClientMemoryManager, moviename: string) =>
    {
        return "Here are the movies I found:" + moviename;
    }
);

cl.AddAPICallback("inform(starttime=;theater=)", async (memoryManager : ClientMemoryManager, starttime: string, theater: string) =>
    {
        return "Not implemented.  Need the combination of starttime&theater pairs";
    }
);

cl.AddAPICallback("inform(taskcomplete;moviename=;numberofpeople=)", async (memoryManager : ClientMemoryManager, moviename: string, numberofpeople: string) =>
    {
        return "Okay your purchase of " + numberofpeople + " tickets for " + moviename + " is confirmed";
    }
);

cl.AddAPICallback("confirm_question()", async (memoryManager : ClientMemoryManager) =>
    {
        return "Which would you prefer?";
    }
);

cl.AddAPICallback("confirm_answer()", async (memoryManager : ClientMemoryManager) =>
    {
        return "Great";
    }
);

cl.AddAPICallback("request(city)", async (memoryManager : ClientMemoryManager) =>
    {
        return "What city please";
    }
);

cl.AddAPICallback("request(moviename)", async (memoryManager : ClientMemoryManager) =>
    {
        return "What movie are you interested in seeing";
    }
);

cl.AddAPICallback("request(numberofpeople)", async (memoryManager : ClientMemoryManager) =>
    {
        return "How many tickets would you like?";
    }
);

cl.AddAPICallback("request(theater)", async (memoryManager : ClientMemoryManager) =>
    {
        return "At which theater would you like to purchase tickets at?";
    }
);

cl.AddAPICallback("request(starttime)", async (memoryManager : ClientMemoryManager) =>
    {
        return "And what time would you like to see it?";
    }
);

cl.AddAPICallback("request(date)", async (memoryManager : ClientMemoryManager) =>
    {
        return "What day would you like to go?";
    }
);

cl.AddAPICallback("multiple_choice(starttime=)", async (memoryManager : ClientMemoryManager) =>
    {
        var starttimeProgram = await memoryManager.EntityValueAsList("starttimeProgram");
        await memoryManager.ForgetEntity("starttime");
        return "There is a " + starttimeProgram.toString() + "showing.";
    }
);

cl.AddAPICallback("multiple_choice(starttime)", async (memoryManager : ClientMemoryManager) =>
    {
        await memoryManager.ForgetEntity("starttime");
        return "Would one of those times work for you?";
    }
);

cl.AddAPICallback("multiple_choice(moviename)", async (memoryManager : ClientMemoryManager) =>
    {
        return "Do any of those sound interesting to you?";
    }
);

cl.AddAPICallback("multiple_choice(theater)", async (memoryManager : ClientMemoryManager) =>
    {
        return "Would you like to purchase tickets to one of those theaters?";
    }
);


cl.AddAPICallback("deny()", async (memoryManager : ClientMemoryManager) =>
    {
        return "This system is for buying movie tickets";
    }
);

cl.AddAPICallback("greeting()", async (memoryManager : ClientMemoryManager) =>
    {
        return "Hi welcome to our service. Would you like to purchase movie tickets?";
    }
);

cl.AddAPICallback("greeting(greeting=)", async (memoryManager : ClientMemoryManager) =>
    {
        return "Hi welcome to our service.";
    }
);

cl.AddAPICallback("closing()", async (memoryManager : ClientMemoryManager) =>
    {
        return "I have successfully purchased your tickets";
    }
);

cl.AddAPICallback("closing(closing=)", async (memoryManager : ClientMemoryManager) =>
    {
        return "I have secured those tickets for you";
    }
);


cl.AddAPICallback("thanks(closing=)", async (memoryManager : ClientMemoryManager) =>
    {
        return "Thank you and enjoy the show";
    }
);


cl.AddAPICallback("thanks", async (memoryManager : ClientMemoryManager) =>
    {
        return "Thank you";
    }
);

cl.AddAPICallback("RetrieveStartTimesFromCityDateMovienameTheaterReferencetime",async (memoryManager: ClientMemoryManager, city: string, date: string, moviename: string, theater: string, fuzzystarttime: string) => {
    var dbConfig = {
        "server": "localhost",
        "user": "MovieBot",
        "password": "We're#1.",
        "database": "MovieDomain"
    };
        sql.setDefaultConfig( dbConfig );
        let results = await sql.execute( 
        {
            procedure: "SPRetrieveStartTimesFromCityDateMovienameTheaterReferencetime",
            params: {
                City: { type: sql.varchar, val: city },
                Date: { type: sql.varchar, val: date },
                MovieName: { type: sql.varchar, val:moviename },
                Theater: { type: sql.varchar, val: theater },
                Referencetime: { type: sql.varchar, val: fuzzystarttime }
            }
        });

        let datarows: {starttime: string, offset:number}[] = results[0][0];
        let starttime = datarows.map(m => m["starttime"]);
        for (let time of starttime) {
           memoryManager.RememberEntity("starttime", time); 
        }
        let exactmatchfound = (datarows[0]["offset"] == 0);
        memoryManager.RememberEntity("exactmatchfound", exactmatchfound.toString()); 
        memoryManager.ForgetEntity("fuzzystarttime"); 
        return "...";
})
