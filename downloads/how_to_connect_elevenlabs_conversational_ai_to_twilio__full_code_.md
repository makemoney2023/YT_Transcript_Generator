# How To Connect ElevenLabs Conversational AI to Twilio (Full Code)

## Metadata
- Duration: 00:35:30
- Author: [object Object]
- Views: 107

## Transcript

Hello Legends. So eleven labs just released their conversational Ai agents. And in this video, I'm gonna show you how to plug those agents in the Twilio. So you can have both inbound and outbound calls. And I'm also gonna show you how to trigger outbound calls from Make dot com and how to pass through custom variables from make dot com like customer name and other personal details into your agent. So when you're calling your customer, you can greet them by name and have a very personalized conversation. I'm gonna show you, all the code in Rep how to deploy rep, all the settings you need for Twilio and eleven labs, And I'm also gonna go over, exactly how to authenticate your requests so you can actually pass through custom variables, because That was a little bit difficult to figure out. And I know the major use case for this is gonna be to, like, feed custom variables as well. So I'm gonna show you exactly how that works. So I'm gonna give you a full run through of the red code. And you can download the red code from my gum road, there'll be a link in the description of this video. But, after watch this tutorial, I think it'll probably take you, like, five ten minutes, deploy this system for yourself. So It's pretty cool Hope you stick around. I'm gonna first demonstrate an outbound call from Mate dot com. And then I'm gonna get right into the code as well. So, yeah, Buckle up boys. Let's go. Alright. So let's demo an outbound call. So I've got a Http module over here, which is actually sending a payload across to my rep. And this is what is initiating that outbound call. So I've got a I've got two variables in this payload. One is the prompt, which is gonna be fed into my actual agent. And then one is the number, which is used to actually dial out on my mobile phone. So In other examples where I show this sequence, you can actually put, like, a Google sheets module here, and you can plug it into this Http module, and you can make it, for example, every time you get a new lead into Google sheets. You would just pull out the phone number, the name, other personal details, you would feed them into here using, like, variables, and then you would basically have an automated system that just sends out calls to customers whenever, you know, a new role is added to Google sheets. But for this example, I'm just gonna right click and run this module only. So my phone will start to ring. Hey, Bart. How can I help you today? Hey, I wanna book my car for a service. Hey, Bart. A card you haven't? And when? Okay. So you can see that it works. We essentially closed the loop over here where we called out from mate dot com, and we fed in a custom prompt. Now, in a eleven labs I don't have all the proper configuration of, like, tool calling or a proper prompt. So you can just quickly see here. I'm just using like this the standard hi Eric and whatever else. So, I'm actually not gonna run through any of the tool calling or knowledge based stuff here because There'll be a bunch of videos about this. I'm sure there'll be better than my video about this. What I'm really gonna be focusing on is obviously this code and how to get the integration between Twilio and eleven labs done correctly and had a pass in custom variables. And I think really, the biggest use case of these kind of, like, Ai calling systems is obviously, yes, inbound calls, but also outbound automated outbound calls where you're sending personal information as well. So this is, I really think the bread and butter of the system, and that's why this video is gonna be specifically, like, about codes to be code heavy. But I do think there is a way where you can actually connect your phone number automatically into here from Twilio. If you don't wanna code anything, you could just go into the, I think this phone number setting. Although I don't Haven't tried out how to actually, like, initiate outbound calls from here or whatever else. So anyway, for this video, it's gonna be, yeah, the coded solution. So over in rep, the file... When you download the file from my gum road, you're not gonna have some of these text files, So you don't have to worry about that. You're not gonna have this new Js file as well. This is basically, all the stuff that, like, took me a while to figure all this stuff out. So I've got a a lot of different notes here. The primary files that we're using to run this are index as the main entry point, inbound calls as you would assume for inbound calls and then outbound calls for outbound calls. So we just use this file for that Mate dot com outbound call. But then I also have this file here called for the legends. And inside, we've got two separate folders. So sorry, this folder for the legends. We've got two folders, inbound and outbound. So, basically, when you're creating this... Let me just get my github open as well, because I posted it on my github. Is it here? I've got some diagrams that I think you guys would wanna see as well. Yeah. I'm just gonna bring this here? So what are we looking at? Okay. So the first thing I wanna speak about is when you're actually... When you're when you're when you're interacting with the conversational Ai agent, There's two ways that you can communicate with the agent. The first way is, you can do so in an una authenticated way, or you can do so in an authenticated way. So if I go to eleven labs and I go to this, security panel, basically, if I want to feed in, these are called enable overall. This is like that custom prompt. Right? So if I wanna feed in a prompt from mate dot com or if I wanna feed in, like ten different variables into from meg dot com and then feed them into my actual agent, I need to enable these settings. So if I turn all this stuff off, and I turn this off, for example, when I hit save, this is the most basic way that you can interact with this conversational Ai agent. This is the una authenticated way. And this is basically like public access. Anyone can access your agent have a conversation with them, which you probably don't wanna do. But the stepping stone to get to the code that has the authenticated agent, was basically a creating this basic version first and then authenticating and then introducing these overrides, which is the custom prompts. Yeah. So over in the Github, we've got we've got these two methods. And as you can see with the on una authenticated method, we... All we can do is just generate a response. Whereas if we do authenticate the Api call, They can pass through custom parameters, and then we can generate the response. So for example, if we did this, I couldn't get my meg dot com to send in customer name and customer details. All we would do is just speak to the standard settings, that we have set up on our agent here. Right? So maybe for, like, inbound agents you might use this system, and then you would add, like, a knowledge base and do some basic tool calling. And that's maybe the use case for this. But really, What we're gonna be focusing on is authenticated calls for outbound calling because we wanna send those details from Meg dot com. So just to do authenticated calls, you actually have to get, like, a assigned Url. I think it's called. And that enables you to actually pass these custom details and overwrite. So the first setting you have to do when you wanna use this specific version of the caller, I e, the current file for outbound calls, and I think the inbound calls is una authenticated for now just to show. Nope. Get signed your url. So these these are both authenticated. So if you wanna use this current system as soon as you download it, You've gotta go to eleven labs first. And you can just click all these, like, just who what it doesn't even matter because you might actually wanna override these in the future. Make sure you hit save as well. And with this, we're now able to override the language, the first message assistant prompt the voice so there'll be some documentation at the bottom of my, bottom of my github, I think for signed authenticated requests. It might be this. And there's a specific payload structure that you can follow. So in my code, I just limited it to prompt and first message. I don't do any... I don't change the voice Id. I don't change the language or anything like that as well. But you can just go into the documentation and figure out the rest of the settings you might need. Of parameters that you might need for, like, changing the language or whatever else. So if I just go back here and scroll up to here. So, yes, both of the codes that I'm showing you use the authenticated request, it can pass custom parameters. But the code base does include the una authenticated version, then the authenticated version. And then, yeah, basically, with the authenticated version, I made one variant where we don't pass through custom parameters, we just authenticated it for fun. And then I made another code that actually passes through custom parameters. So at a high level wanted to explain all that to explain why there's so many files over here. None of these are actually effectively used right now. When you deploy this, these are just like storage files. But if I open this up a little bit more, so we have inbound normal. So for una authenticated inbound calls with your agent, so obviously no custom parameters, then we have inbound authenticated. So for authenticated inbound calls of your agent, but no custom parameters, but, like, obviously, that's the next layer, like, the next thing done, So it's authenticated. And then we have custom prompt, so we have authenticated calls with custom prompt. For the inbound, I don't actually, I don't have an Api call to get, like, pre... Like, a pre call web, that obtained like, that takes the customers you phone number searches against to database and then returns that information and feeds it into the call. I haven't done that bit, but you can do that. You can do that yourself. There's probably other There's other real time Api videos that I've made that actually do that pre call web. You can just browse my video history and you'll be able to find it. But, I'm gonna go through the code in a second. I just wanna show you where the specific component is. Yeah. This is where you would feed in the custom prompt for this specific one. So don't worry. It's probably a lot to look at right now. I'm gonna go through it later. I just wanna explain all the files first, and then I'm gonna dig into the code. And then from the other side, you can see we have the outbound. We have outbound normal. So just regular Api calls to the public, like, to the public endpoint, then we have authenticated, then we have authenticated, sorry, authenticated here with a custom prompt, and then we have outbound custom make And this is the actual file that we have outbound calls dot js s. This is the actual file that we're using, and this is making authenticated calls and passing custom parameters from Mate dot com and then setting those parameters in the agent. So this is the first code will just basically start off by going over. But like yeah. That's what these two files are for. And the reason I left them more was firstly one because, like, these... There's are slightly different between, like, the normal is different than the authenticated because you have to do the authentication process. Which is different from this, which because you have to do the custom prompt process as well. So there wasn't a lot of documentation when I was creating this, and maybe in, like, a week or a month's time, there'll be heaps more documentation, but I thought, better to just put out the resources into the universe in case someone comes comes across, and they just need some different variation. I didn't wanna just restrict people to, like, the most complex code. Wanted to give the, you know, the basic code as well in case. That's a good starting point for different projects. So that's what we have over here. Just literally a bank of all different codes that we could use, and they all work to use them, you would just like, copy from here to the bottom and then paste it into the outbound. So if it's an outbound to go into this file, if it's an inbound to go into the inbound dash calls js s. So at a high level, when we're placing our call or when we're calling the phone number that's associated with this for inbound or outbound calls, we're actually first entering into the index dot js s file, And in order for us to just have one rep that has both inbound outbound calls, we have to have this common entry point, so that we can basically serve this file as the main entry point for our file. So any inbound outbound calls first route through here. And then they're pushed out to either outbound Js or the inbound calls Js. So inbound calls js at a high level. So we're basically pulling in all the environment variables that we need from our environment file over here. I'll dig into that in the second. We then got a helper function to get the authenticated conversation Url. So now we're not just using the public, endpoint. We're using the authenticated endpoint. And for this, we just need the eleven labs Api key to be put into our environment variable. And then we have a pretty standard process to actually connect, like, to handle the incoming calls from Twilio. So to basically create that media stream between Twilio and then this rep server, and then we connect up to eleven labs as well. So then we could have, like, the streaming of audio in and streaming of audio apps. So that real time conversation. So this is just basic configuration for Twilio. On how to establish that connection between media stream and our... In this replica code. So when a when a phone call comes in, it bounces into here. And then from here, it bounces into this web over here. So actually, when we're in Twilio, I'll show the settings in a second, but, we we basically forward the endpoint to this web over here. That's why we enter into here, and then we basically start the conversation. We we create the call over here. So scrolling down, we've got some... Yeah. Some key configuration over here. And pretty much over here is where we starting to open up that websocket. So we're getting the signed Urls. We can have authenticated requests to far our agent. And then as you scroll down over here, there's a there's a lot of comments that you can see, we're opening up the website, we're then handling messages from both eleven labs over here in this function. And then we're handling messages from Twilio in this function over here. So there's a couple of settings in eleven labs that we need to change for our agent in order to actually facilitate these conversations. And I think that is in here. So the first is we need to make this T t output format to u law eight thousand hertz. And then I think in advanced as well user input audio format. So if for Twilio, we need to have these both set to eight thousand. Otherwise, the, audio format will not work and we just we won't be able to speak with for agent. So make sure you change Yeah. Your agent has to be changed to this. And then there's also a warning that comes up that probably right now, maybe in a future won't be here. If you're changing it to this specific, you know, eight thousand hertz audio format that you cannot run your agent in a widget. So you might just need... You might just need to duplicate your agent and have something totally separate. But going back to the code is pretty basic. Right? So we're creating the websocket, and after we create the websocket, we're having in the conversation with eleven labs, and then we're processing the audio from eleven labs, and processing the audio from Twilio. To basically make it... Yeah, like, work with each other. So if I go back to my github, I think this is... This is it here. So... Yeah, When we're when we're creating the phone call, like, when the user places the phone call, it goes across the Twilio. Then Twilio, which is the, like, the actual Twilio app itself. Has to create a connection between our websocket. And our websocket is just the rep click code. So it creates a Websocket connection, which is basically always on with our replica code. And then our replica code is what plugs in from we'll plugs into eleven laps. So that's why over here, there's a certain pro... Like, data processing over here, which is the streaming of audio, from the user into our replica code. And then there's a separate processing up audio from our replica code into eleven labs. So as you can imagine, the customer replaces a call, they might say, hey, what are your open hours Then over here, we convert that into an audio format for our, replica code. We then send it across to eleven labs. Eleven labs generates the response. So what your open hours is nine to five. It returns the response to our websocket. Which is the replica code, then our replica code converts it into an audio format that's suitable for a Twilio, and then Twilio basically plays it back to the user and the user gets the response. So that's how this works. So that's why essentially, Let me just backspace these. That's why we've got two different portions here. So handling messages from eleven labs, and then handling messages from Twilio. That's what is basically happening happening in these two components here. And, yeah. So that's pretty much the high level overview of the code. If you wanna make some other enhancements to this, then really what you would wanna do. Okay. So this code is just authenticated, but it doesn't have that initial configuration. So if you wanted to do, like, a pre call web for your inbound calls. So when someone calls up, you can actually pull the customer's phone number from the T. So from from Twilio, you can actually pull the customer's phone number. And if you have, like a Google sheet database that has customer phone number and like previous calls. Then you'd be able to make... Let's say you run all this and make dot com. You'd be able to send a call to make dot com that says, here's the customer's phone number, find the road that associates this phone number pull in the pulling in those details, and then feed them into your agent. If you wanted to do that, you would have to use this file over here for inbound custom prompt. And once again, it's authenticated, it's the exact same flow as before. So we're, sending our call from Twilio into here, and then we're creating that media stream. Which is this bit over here, we're basically we're creating this connection over here. And this is where we're actually creating the initial prompt and first message. So if I go to the bottom over here, you will remember the format of what I'm just showing you now. Is similar to this format over here. So this is using the Javascript S sdk or the get react Sd sdk k. I'm just using in my code. I'm just using straight Javascript. But you can see this is the format over here. So you're gonna override the agent prompt with this prompt variable or the agent first message with this first message variable. So let me just go back. So what you would realistically do here is probably in in this incoming call web, before you actually generate the call, like, before you create the connection to the media stream. You probably have a couple of steps over here to take the incoming, like, the phone number from the customer, which the payload from Twilio when it comes into this web, like, when it's sent into here, the payload contains the phone number for the user. So the the invoking phone number, The phone number that, like, if I called it, would have my number. So I can grab that phone number from the payload from Twilio, then I can create an outbound Api call to, let's say, Mate dot com. I can have a make dot com scenario that takes the phone number, return some information. And then I would pass that information within this t over here. So I'm gonna show you in a second for the outbound call how we manage that. But, yes, it's possible to take the phone number, do a web over here somewhere, and then pass the custom parameter into our actual media stream, and then you can access it over here. So, yeah. Just... You can plug this into Google, you can take them this code and actually plug it into my Google. Sorry into Ai into, like, chat Gp, and then plug both codes into chat And say, hey, help me make this web. But once again, I've got real time Api videos out there. I think if you watch the part three video, part three real time Api. I'll show you how to send the payload from mate dot com and and actually how to do that might be a part one or two part one or two actually has pre call web hooks. But I leave that with you guys. And yeah, this is where you would basically ingest it over here. So you could just do prompt and then instead of saying you are sophie from Bart automotive, you would just have that. Variable inserted into here directly. So now that we've looked at index dot js s at a high level, This is the main entry point. We've looked at inbound calls. The structure for outbound calls is very similar as well. The main difference is that we have to actually create the phone call here. So we have to have some other configuration files. Oh, sorry, either configuration variables from the, environment file. So we're we're gonna need the Twilio phone number that we're calling from. So this is, basically set up in Twilio we'll need the Twilio auth token, the Twilio f Id as well. So I'll show you the you... The e v file in a second and had a plug in into Twilio. But as you remember from that first inbound call code, this is this is the exact same function for authenticating our requests. So it's all the exact same use the exact same Api key. And so now what we're doing is, when we're first sending this call from Make dot com, it's going into here. Into this inbound... Sorry, outbound call web hook. And from here, we're actually processing it. And then we're sending it across to this, outbound call t. So at this stage, let me just backspace this stuff. This this part here is actually very similar to this part here. So in outbound call Js, the main thing that we're doing is we're basically taking the variable that we sent from our Mate dot com, So as you remember if I open this up, we've got prompt variable and a number variable. Over here, we're just basically saying, let's get that prompt variable, and let's just save it to prompt, for example. And then we're feeding it through from this a web hook into our media stream. This is what we're also gonna before. If you're an inbound call, you wanna make a pre web. This is how you pass that parameter in this swim response. So we've got parameter, name equals prompt, and this is the prompt value, which is this thing over here. So yeah, for example, if you were to copy this version, this line would just be, like, an outbound Api call to meg dot com, and then you would generate your... I don't know, first message from your... Whatever you wanna do. And then you would feed it through. It would make its way into this media stream over here, and then you would capture it at one of these steps a little bit later. So over here, I've got the initial configuration files as well. And these configuration files, if I go back to inbound call. Where are they that I miss them? Wait. Sorry. It was in custom prompt. Okay? Here it is. So, yeah. If you were to use this inbound custom prompt version, so you wanna do a pre web hook. These configuration files, once again are the exact same format as in the outbound call. The main thing that we're doing is for the prompt value. We're just accessing those custom parameters that we pass through from here. And we're accessing them over here and we're saying, okay, you just use that value. So what that means is, this entire message here, your bar, you're calling customer to book a service in for their car. That entire message is ingested into the prompt as an override. And then for first message, you could actually done the same thing. So you could actually go into here and make a new variable called, you know, first message, and I might say, hey bar or, you know, whatever you want that personalized message to be. And then you could do the exact same thing here. You would just pull out that first message variable, you would add a new line exactly like this, and you would call it first message, and then you would feed it into this first message over here. So instead of me putting a static first message. You can just put your own custom first message. But that's really the main modification you might wanna do. So I think really what you would wanna run is probably inbound custom dash prompt, so you can do a pre call web when someone's calling you up. And then you would just leave this version to run for outbound calls. And then scrolling down, it's the exact same setup as before. So, we have sent the configuration to eleven labs. Yes. Cool. Okay. So it's probably less comments over here for how to process things. Where basically, we're handling the message from Twilio and then we're handling the message from eleven labs. So I'm not sure exactly where it starts. Or basically like this section over here is the eleven labs processing section. Now, I wanna show you one more thing. So we just... We're were speaking about the meg dot com. And this is exactly how that setup would be. So we've got Meg dot com Twilio websocket, which is our rep code, and then the eleven labs conversational Ai agent. So when we're trying to send in custom parameters. Once again, we have to use the authenticated versions, We have to do authenticated Api call. We can pass through custom parameters. By the way, if you try add custom parameters with an una una version. I think you might make the connection for the call, but you won't be using any of the custom parameters. So, like, if you ever buckled as to why it's not working, or make sure authenticated call. So, okay. We're sending the value... The variables from mate dot com. So we've got trigger outbound call with custom parameters, which is what we did over here. Trigger outbound core custom parameters, Oops. Wrong one. And then we're creating our t, and then we're establishing the connection between Twilio and Websocket, which is the... It's called media stream. So that's what we're doing. We're basically ins integrating Twilio We're telling Twilio to create a connection, a media stream connection between Twilio and our replica code, and we're also saying, hey, we've got this custom parameter of prompt, pass it through as well into that media stream so we can access it. Then we're getting the signed Url and assigned Url is this function over here. So this is this is the... Whoops. This is the, helper function. This is the actual function that we're using to get the signed Url. And then there is a, I think, a try catch over here where we're console, okay, somewhere here, somewhere here. On open. Okay. We're we're... Okay. This is where it actually starts. So we're establishing the eleven eleven labs connection with the signed Url, so it can actually pass through the custom variables. So that's what we're doing over here. We're established... We're getting to signed Url and then we're sending the agent, the custom parameters. So must be signed Url first, then custom parameters into the agent, and then we'll get the response, the personalized conversation, and then we're streaming the response back to Twilio and speaking to the customer. So once you send it the very first time, you don't have to keep res sending it. Like, yeah. It's it's for that session, it's already gonna be, like that agent's gonna have that memory for that session anyway. So eleven labs is gonna be basically managing all that stuff in the background. And, yeah, It's it's actually very convenient. So going back to the code okay. Now the environment variables. So there's a bunch of environment variables here, we have the twilio phone number which is the outbound phone number. So in Twilio, you have a phone number that you used to place calls. That's what this number is. It's also the same call... It's also the same number that customers will call when they wanna speak with your agent. So it's the exact same from or from my case specifically, that's the Twilio phone number. We have Twilio Auth token and Twilio account Si and to access those. You have to be in your, main home page or your dashboard, Sorry. You've got account Si and auth tokens, so you just copy these values and then paste them in. So you basically how you get these two so far. Then eleven labs Api key and eleven labs agent Id. So over in eleven labs, you just generate your Api key, there'll be a setting somewhere here. But to get the agent Id, you can see the agent Id over here. Or it's also in the Url. So this g ending in n. That's what I have over here, g ending in n. So right now, we've got all the environment variables, eleven labs, Api key, Twilio blah blah blah. Now we have phone number. So in Twilio to actually set this up for inbound calls, I'm then gonna go to the region where my phone number is hosted. I'm gonna go across to active numbers. And now I'm gonna go to... This is my phone number that I'm using. So I'm gonna Australia. Okay. And then over here is the Url that I'm gonna be gonna be placing. So when customers call this phone number, it actually forwards it to my rep. So I just at a high level since I'm using this number for both. Inbound and outbound calls. I would just copy this, and I would paste it into here. And this figure it, like, this this value is specifically used for outbound calls. And then... Yeah, Would basically paste it into there. But for inbound calls, let's actually deploy this And yeah, I'm gonna show you how to how to make this live now. So I'm gonna hit deploy. I'm gonna set up basically what, like, using the default settings, everything default default default. It's gonna take a few minutes. So... I am gonna come back to here when it's done. Alright. Awesome. So now it's been deployed successfully. So this Url basically gives us access to this rep server twenty four seven. So we can we can have a call at any time of the day any day of the week. So I'm gonna open this up and copy this Url in full, Close this, go across the Twilio, and now I wanna paste it into so... Again, my phone number that I'm using for inbound and outbound calls is this. And, right now, I have voice configuration. Maybe you've purchased a phone number that actually has like, you can scroll down and it will have a voice configuration and an Sms or whatever configuration. Make sure you're setting up the voice configuration for this. Because that's what we obviously need. And, for my Url, I'm just gonna backspace this first section, and you can see I've got incoming dash c in dash eleven. So I'm gonna explain that in a second, but I'm gonna paste in that Url that I just copied the deploy Url from my rep server, and now when it hit save configuration. So if I go back to rep now, and if I open up inbound call Js and just scroll up a little bit. So this is the endpoint that I need a target when I'm placing a new phone call incoming call eleven. So you could literally just copy this and back in Twilio, this is the exact same thing that we need to backspace and paste in. And now, when a phone call is placed, just so you can understand what's going on here. It's like it's going to our rep server in general with this very first Url, and then we're directing it across that specific code, forward slash incoming call eleven. And that's why when we're placing a call, we're literally landing that call, that bundle of information from Twilio right this pocket over here, and then we're taking that information immediately and creating that media stream, which is that connection. And and I'm kind of, like, pushing the point a lot here. But that is where is that? Yeah. That is this thing that we're connecting to. Okay. So now that we have this setup for inbound calls, I'm gonna demonstrate actually calling up this agent. So I have my number saved over here. It's gonna be a generic agent. Once again, I didn't actually do any eleven labs, like, configuration in the back end, like in the actual portal to change the agent. So it's probably gonna pick up and say, hi, I'm Eric. How can I help you? I've to another name. It's very confusing. I have definitely not done a good job here, But I'm gonna call right now, and, yeah, We're gonna we're gonna speak with our agent. Did I save this fourth Yep. Same number. And I have there as well. Okay can let me call again. Hi, Eric. How can I help you today? Hey, Eric. How are you doing? I'm doing great. Thanks for Asking. Okay. Good. So I don't know what happened that first time when I called, maybe the connection was established just yet, but I basically called this Twilio phone number, which is let's say my inbound customer support phone number. Then I was routed via this Url across to my rep, and I made it into this entry point over here, and then we basically created the connection between eleven labs and Twilio and our server, and we had that conversation, and I could literally, you saw. It was hi. I'm Eric, and I asked a question. I got a response back. So everything is working perfectly fine there. Now the next thing for us to do is actually to take the same Url, so this same bit here. And now in mate dot com, I'm gonna change this whoops. I'm gonna change this Url where this pointer. I'm gonna change this Url. So I'm gonna take this and control v, and just make sure it's just one single forward slash. So now this eight this Api call is gonna point to this deployed version of rep, and it's gonna be accessible twenty four seven like I mentioned before any day time. Now, also to explain this, but over here, so we got forward slash outbound call. So where is forward slash outbound call. If I go to outbound call dot j s. This is the... Where is it? Here. This is the entry point. So outbound call. This is where we're landing, So I just wanna double check quickly, So outbound authenticated. Maybe some of these have different names. No. Outbound calls is the exact same outbound calls the exact same outbound call. I just want to be sure all the code uses the exact same names, outbound call. Okay. So outbound call it doesn't matter whichever one of these codes that you use, it'll it'll be perfectly fine. It's gonna work with that. So, yeah, this is the outbound call entry point. Once again, when we're actually using the... When we're triggering Mate dot com, this is where it lands that pocket of information into, then we're pulling out the customer number, which is if number is there, would take would basically taking that phone number, And we're triggering the, dial out to the customer. This is what we have from, which is the Twilio phone number. Once again, it's my Twilio phone number that we're calling the customer from. The two number is the customer's phone number, which is my mobile phone number. And then we're calling the number to this endpoint over here, which is into the into this, basically, over here. So we can create that media stream. That's how this little sequence works. Okay. So now that we have this done, I'm going to right click and run this only, and we'll get a phone call. Hey, Bart. How can I help you today? Alright. Thank you. And there you go. So now we've deployed the inbound and outbound caller, so we've actually gone through and, yeah, deployed this specific rep server to be live twenty four seven. This is the this is the main Url that you need to use for inbound and outbound phone calls. We went through the environment variables. How to set them up. We went through Twilio how to set it up. We went through a level maps how to set it up as well. Which once again is super important You must choose authenticated requests. If you wanna pass in custom variables. And you must do eight thousand hertz for output format and for advanced eight thousand hertz for user input format as well. In order to work with Twilio, that's the... That's specifically what you need. Other than this, I think everything's covered. Yeah. All the previous code here, you don't actually need to use the main files that you will get in your, when you're downloading this from my gum road is gonna be index inbound call and outbound call. And then I also put a sample meg dot com payload text, but, yeah, you guys can basically pause the video here and just see how this payload looks for me. So anyway, Hope this video was useful for you guys. If you want to Yeah. If you're a business owner and you wanna build this out a little bit more sophisticated for your own workflow. This is probably the most difficult Ai caller that I've made, like, in terms of, like, figuring out the code for this. It might have just been me getting blocked in my brain just not being able to, you know, figure out all that kind of stuff out, but it was a little bit difficult to get running, took me some time. But... Yeah. So if you want someone to build this kind of thing out for you. Feel free to reach out to me. I'll leave my description, or so I leave my email in the description of this video. Alright, guys. I hope you enjoy. Hope have a lot of fun with your inbound and outbound, eleven labs conversational Ai agent. Please like, subscribe. If you download the code from Gum road, please like, leave a, you know, please donate, leave a tip, whatever. But, yeah. Alright. G. See you later.