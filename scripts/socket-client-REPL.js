var repl = require("repl");

/*
	IMPORTANT: Please only use arrow functions!
	You can access other functions / variables by using r.context.[thing] !
	"r" will be available at runtime and refers to the REPL instance.
*/

const commands = [];
function defineCommand(name, help, fn) {
	commands.push({
		name,
		help,
		fn
	});
}

defineCommand("emit", "Emits a socket event", (eventName, ...args) => {
	r.context.s.emit(eventName, ...args);
});

defineCommand("emitData", "Emits a socket event with some default data", eventName => {
	r.context.emit(eventName, {
		userName: "Patrick was here"
	});
});

defineCommand("c", "Clears the console", () => {
	console.clear();
});

defineCommand("con", "Checks the connection and connects if it needs to.", port => {
	if (port) {
		const connectionString = `http://localhost:${port}`;
		console.log(`Making new connection to ${connectionString}`);
		r.context.s = require("socket.io-client")(connectionString);

		return;
	}

	const isConnected = r.context.s.connected;
	console.log("Socket is connected ? :", isConnected);

	if (!isConnected) {
		console.log("Not connected... Connecting...");
		r.context.s.connect();
	}
});

defineCommand("listen", "Listens to socket-event", (eventName, handler) => {
	r.on(eventName, handler);
});

defineCommand("help", "Displays this help text", () => {
	console.log();
	for (const command of commands) {
		const fnString = command.fn.toString();
		const signatureTerminator = fnString.indexOf("=>");
		const signature = fnString.substring(0, signatureTerminator);
		console.log(`${command.name} - ${command.help} --- Args: ${signature}`);
	}
});

// Start the repl
console.log("\nWelcome to the SROCKET client repl... Type 'help()' for help, remember to execute commands like functions\n");
const r = repl.start("SRocket -> ");

// Setup repl before setting up the commands
r.context.s = require("socket.io-client")("http://localhost:1340");

// Setup commands
for (const command of commands) {
	r.context[command.name] = command.fn;
}
