const EventSource = require('eventsource');
const axios = require('axios').default;
const EventEmitter = require('events');

class Client extends EventEmitter
{
    constructor(config, logger)
    {
        super();
        this.config = config;
        this.logger = logger;
        this.isConnected = null;
        this.client = null;
        this.eventSource = null;
        this.queryId = 1;
        this.reconnectTimeout = null;
        this.messageReceivedCount = 0;

        this.initClient();
    }

    initClient()
    {
        let clientHeaders = {
            'Content-Type': 'application/json',
        };

        if(this.config.token) {
            clientHeaders['X-Token'] = this.config.token;
        }

        this.client = axios.create({
            baseURL: this.config.baseUrl,
            headers: clientHeaders,
            responseType: 'json'
        });
    }

    initEventListener()
    {
        this.logger.info("Connecting to event relay...");

        let url = null;
        let esOptions = {};

        url = new URL(this.config.eventRelay.url);
        url.searchParams.append("topic", this.config.eventRelay.topic);

        if(this.config.eventRelay.jwt) {
            esOptions = { 
                headers: {
                    'Authorization': 'Bearer ' + this.config.eventRelay.jwt
                }
            };
        }
        
        this.eventSource = new EventSource(url.toString(), esOptions);
        this.eventSource.onmessage = this.onMessageReceived.bind(this);
        this.eventSource.onerror = this.onError.bind(this);
        this.eventSource.onopen = this.onOpen.bind(this);

        this.reconnectTimeout = setTimeout(this.forceEventListenerReconnect.bind(this), 60000);
        this.messageReceivedCount = 0;
    }

    forceEventListenerReconnect()
    {
        this.logger.info("Forcing event listener reconnect");
        this.eventSource.close();
        this.initEventListener();
    }

    onMessageReceived(e)
    {
        let data = JSON.parse(e.data);
        this.emit(data.listener + "/*", data.event);
        this.emit(data.listener + "/" + data.event.name, data.event);
        this.messageReceivedCount++;
    }

    query(endpoint, method, params = [])
    {
        let jsonRpcCall = {
            jsonrpc: '2.0',
            id: this.queryId++,
            method: method,
            params: params
        };

        if(endpoint[0] != '/') {
            endpoint = '/' + endpoint;
        }

        return this.client.request({
            method: 'post',
            url: endpoint, 
            data: jsonRpcCall
        }).then((response) => response.data.result);   
    }

    onError(e)
    {
        if(e.message != undefined) {
            this.logger.error("Event relay error: " + e.message);

            // If we were connected, trigger a reconnect
            if (this.isConnected) {
                this.forceEventListenerReconnect();
            }
    
            this.isConnected = false;
            this.emit('disconnected');
        } else {
            clearTimeout(this.reconnectTimeout);

            if (this.messageReceivedCount > 0) {
                this.logger.warn("Event relay unknown error after having received messages, suspecting disconnection");
                this.forceEventListenerReconnect();
            } else {
                this.reconnectTimeout = setTimeout(this.forceEventListenerReconnect.bind(this), 60000);
            }
        }
    }

    onOpen(e)
    {
        if(this.isConnected === null) {
            this.logger.info("Connected to event relay.");
        }

        this.isConnected = true;
        this.emit('connected');
    }
}

module.exports = Client;