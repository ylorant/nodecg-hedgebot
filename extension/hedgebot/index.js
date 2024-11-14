const Client = require('./client');
const ScheduleModule = require('./modules/schedule');
const TimersModule = require('./modules/timers');
const RemoteTimersModule = require('./modules/remote-timers');

const AVAILABLE_MODULES = [
    ScheduleModule,
    TimersModule,
    RemoteTimersModule
];

class HedgebotExtension
{
    static get DEFAULT_REPLICANT_OPTS()
    { 
        return { defaultValue: null, persistent: false };
    }

    init(nodecg)
    {
        this.nodecg = nodecg;
        this.replicants = {};
        this.modules = {};
        this.client = null;
        this.alreadyConnected = false;
        this.fetchTimersInterval = null;
        this.fetchRemoteTimersInterval = null;

        nodecg.log.info("Initializing Hedgebot bundle");

        // Creating replicants
        this.replicants.connected = nodecg.Replicant("connected", "hedgebot", HedgebotExtension.DEFAULT_REPLICANT_OPTS);
        this.replicants.lastRefresh = nodecg.Replicant("lastRefresh", "hedgebot", HedgebotExtension.DEFAULT_REPLICANT_OPTS);

        nodecg.log.info("Starting Hedgebot client...");
        this.client = new Client(nodecg.bundleConfig.client, nodecg.log);
        this.client.on('connected', this.onConnect.bind(this));
        this.client.on('disconnected', this.onDisconnect.bind(this));
        
        nodecg.listenFor("rpcCall", this.onRPCCall.bind(this));

        this.client.initEventListener();
    }

    fetchLoadedModules()
    {
        this.nodecg.log.info("Fetching current schedule...");

        this.client.query("/plugin", "getList")
            .then((modules) => {
                for (let module of modules) {
                    this.attemptLoadModule(module);
                }
            });
    }

    attemptLoadModule(module)
    {
        for (let moduleClass of AVAILABLE_MODULES) {
            if (module == moduleClass.id) {
                this.nodecg.log.info("Loading module " + module + "...");
                this.modules[module] = new moduleClass(this);
                this.modules[module].init();
            }
        }
    }

    // Events //

    onConnect(e)
    {
        if(!this.alreadyConnected) {
            this.nodecg.log.info("Connected to event relay.");
            this.nodecg.log.info("Fetching initial data...");

            this.alreadyConnected = true;
        }

        this.replicants.connected.value = true;

        this.fetchLoadedModules();
    }

    onDisconnect(e)
    {
        this.replicants.connected.value = false;
    }

    onRPCCall(callData)
    {
        this.client.query(callData.endpoint, callData.method, callData.args);
    }
}

module.exports = HedgebotExtension;