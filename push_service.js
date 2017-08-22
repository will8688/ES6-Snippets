import Api from '../../../core__api';
import ObservableService from '../../../core__super_observable_service.js';
class PushService extends ObservableService {
    constructor() {
        super('PushService');
        this.subscribedMarkets = [];
        this.subscribedEvents = [];
        // Event Listeners
        // From Events
        Api.handleEvent('sportsbook:pushservice:subscribe:events',(events) => {
            this.updateEventsSubscriptions(events);
        });
        // From Betslip Markets
        Api.handleEvent('sportsbook:pushservice:subscribe:markets', (marketIds) => {
            this.updateMarketsSubscriptions(marketIds);
        });
        // From Markets
        Api.handleEvent('sportsbook:pushservice:subscribe:market', (marketId) => {
            const array = [];
            array.push(marketId);
            this.updateMarketsSubscriptions(array);
        });
        // Remap cometd JSON functions to jquery JSON functions
        org.cometd.JSON = {};
        org.cometd.JSON.toJSON = JSON.stringify;
        org.cometd.JSON.fromJSON = JSON.parse;

        function _setHeaders(xhr, headers) {
            if (headers) {
                for (const headerName in headers) {
                    if (headerName.toLowerCase() === 'content-type') {
                        continue;
                    }
                    xhr.setRequestHeader(headerName, headers[headerName]);
                }
            }
        }
        // Remap toolkit-specific transport calls
        function LongPollingTransport() {
            const _super = new org.cometd.LongPollingTransport();
            const that = org.cometd.Transport.derive(_super);
            that.xhrSend = (packet) => {
                return $.ajax({
                    url: packet.url,
                    async: packet.sync !== true,
                    type: 'POST',
                    contentType: 'application/json;charset=UTF-8',
                    data: packet.body,
                    beforeSend: (xhr) => {
                        _setHeaders(xhr, packet.headers);
                        // Returning false will abort the XHR send
                        return true;
                    },
                    success: packet.onSuccess,
                    error: (xhr, reason, exception) => {
                        packet.onError(reason, exception);
                    }
                });
            };
            return that;
        }

        function CallbackPollingTransport() {
            const _super = new org.cometd.CallbackPollingTransport();
            const that = org.cometd.Transport.derive(_super);
            that.jsonpSend = (packet) => {
                $.ajax({
                    url: packet.url,
                    async: packet.sync !== true,
                    type: 'GET',
                    dataType: 'jsonp',
                    jsonp: 'jsonp',
                    data: {
                        // In callback-polling, the content must be sent via the 'message' parameter
                        message: packet.body
                    },
                    beforeSend: (xhr) => {
                        _setHeaders(xhr, packet.headers);
                        // Returning false will abort the XHR send
                        return true;
                    },
                    success: packet.onSuccess,
                    error: (xhr, reason, exception) => {
                        packet.onError(reason, exception);
                    }
                });
            };
            return that;
        }
        $.Cometd = (name) => {
            const cometd = new org.cometd.Cometd(name);
            if (window.WebSocket) {
                cometd.registerTransport('websocket', new org.cometd.WebSocketTransport());
            }
            cometd.registerTransport('long-polling', new LongPollingTransport());
            cometd.registerTransport('callback-polling', new CallbackPollingTransport());
            // cometd.websocketEnabled = true;
            return cometd;
        };
        // The default cometd instance
        $.cometd = new $.Cometd();
        this.startCometD();
        console.info('PushService running...');
        this.subjects = {};
    }
    handshakeConfirmation() {
        Api.handleExecuter('watchdog:report:action', 'push service', 'handshake confirmation');
        //this.subscribeMarket(2194);
    }
    startCometD() {
        $.cometd.addListener('/meta/handshake', this.handshakeConfirmation);
        $.cometd.configure({
            maxConnections: 2,
            url: location.protocol + '//' + location.host + '/cometd',
            logLevel: 'warn'
        });
        $.cometd.handshake();
        //Disconnect when the page unloads
        $(window).unload(() => {
            $.cometd.disconnect(true);
        });
    }
    updateMarketsSubscriptions(marketIds) {

        const marketsToSubscribe = _.difference(marketIds, this.subscribedMarkets);
        // update local list
        this.subscribedMarkets = this.subscribedMarkets.concat(marketsToSubscribe);
        // Perform network operations
        if (marketsToSubscribe.length === 0) {
            //Api.handleExecuter('watchdog:report:action','PushService','Market Already Subscribed!');
        }
        // this.unsubscribeMarkets(marketsToUnsubscribe);
        this.subscribeMarkets(marketsToSubscribe);
    }
    updateEventsSubscriptions(events) {

        const eventsToSubscribe = _.difference(events, this.subscribedEvents);
        // update local list
        this.subscribedEvents = this.subscribedEvents.concat(eventsToSubscribe);
        this.subscribeEvents(eventsToSubscribe);
    }
    subscribeEvents(sportEvents) {
        $.cometd.batch(() =>{
            sportEvents.forEach((sportEvent) =>{
                if (sportEvent && sportEvent.sourceKey) {
                    let channel;
                    // Special: SOCCER from OPTA
                    if (sportEvent.providerRef !== undefined && sportEvent.catRef === 'SOCCER' && sportEvent.providerRef === 'OPTA') {
                        Api.handleExecuter('watchdog:report:action', 'PushService', 'Subscribing to event ' + sportEvent.sourceKey);
                        channel = '/' + sportEvent.catRef + '/' + sportEvent.sourceKey;
                        $.cometd.subscribe(channel, (message)=> {
                            this.processEventUpdates(message.data);
                        });
                        // find current state
                        $.cometd.publish('/service/' + sportEvent.catRef, {
                            sourceKey: sportEvent.sourceKey
                        });
                        $.cometd.subscribe(channel + '/data', (message) => {
                            this.processEventUpdates(message.data);
                        });
                    }
                    // Default
                    else {
                        Api.handleExecuter('watchdog:report:action', 'PushService', 'Subscribing to event ' + sportEvent.sourceKey);
                        channel = '/' + sportEvent.catRef + '/' + sportEvent.sourceKey;
                        $.cometd.subscribe(channel, (message) =>{
                            this.processEventUpdates(message.data);
                        });
                        // find current state
                        $.cometd.publish('/service/' + sportEvent.catRef, {
                            sourceKey: sportEvent.sourceKey
                        });
                    }
                }
            });
        });
    }
    subscribeMarkets(marketIds) {
        // Subscribe New Markets ONLY
        $.cometd.batch(() =>{
            marketIds.forEach((marketId) =>{
                if (marketId !== null) {
                    Api.handleExecuter('watchdog:report:action', 'PushService', 'Subscribing to market ' + marketId);
                    $.cometd.subscribe('/fsbchannel/' + marketId, (message) => {
                        this.processMarketUpdates(message.data);
                    });
                }
            });
        });
    }
    broadcastMarketUpdates(marketModel, data) {
        Api.trigger('sportsbook:pushservice:update:market', marketModel, data);
        this.emit('change:market', marketModel);
    }
    broadcastSelectionsUpdates(marketModel, data) {
        Api.trigger('sportsbook:pushservice:update:selections', marketModel, data);
        this.emit('change:selections', marketModel);
    }
    broadcastBooksUpdates(marketModel, data) {
        Api.trigger('sportsbook:pushservice:update:books', marketModel, data);
        this.emit('change:books', marketModel);
    }
    broadcastBookAndSelectionsUpdates(marketModel, data) {
        Api.trigger('sportsbook:pushservice:update:bookselections', marketModel, data);
        this.emit('change:bookselections', marketModel);
    }
    processEventUpdates(data) {
        const model = new Backbone.Model(data);
        this.broadcastEventUpdates(model);
    }
    broadcastEventUpdates(model) {
        // Post-process data
        if (!model.isEmpty) {
            Api.trigger('sportsbook:pushservice:update:event', model);
        }
    }
    processMarketUpdates(data) {
        switch (data.type) {
            case 'market':{
                const marketModel = this.pushResolveMarket(data);
                // Only Market Updates
                if (_.isEmpty(data.selections)) {
                    Api.handleExecuter('watchdog:report:action', 'PushService', 'Received only Market!');
                }
                // Market & Book & Selections Updates
                else if (_.isEmpty(data.books) === false && _.isEmpty(data.selections) === false) {
                    Api.handleExecuter('watchdog:report:action', 'PushService', 'Received a Book and selections (and market)!');
                    marketModel.set({
                        selections: this.pushResolveSelections(data.selections),
                        books: this.pushResolveBook(data.books)
                    });
                    this.broadcastBookAndSelectionsUpdates(marketModel, data);
                }
                // Market & Book Updates Only
                else if (_.isEmpty(data.books) === false && _.isEmpty(data.selections) === true) {
                    Api.handleExecuter('watchdog:report:action', 'PushService', 'Received a Book without selections!');
                    marketModel.set({
                        books: this.pushResolveBook(data.books)
                    });
                    this.broadcastBooksUpdates(marketModel, data);
                }
                // Market & Selections Only
                else {
                    Api.handleExecuter('watchdog:report:action', 'PushService', 'Received only Selections!');
                    marketModel.set({
                        selections: this.pushResolveSelections(data.selections),
                    });
                    this.broadcastSelectionsUpdates(marketModel, data);
                }
                // ALLWAYS BROADCAST MARKET UPDATES
                this.broadcastMarketUpdates(marketModel, data);
                break;
            }
        }
    }
    //RESOLVE THE PUSH BOOK
    pushResolveBook(books) {
        let _book;
        _.each(books, (val, key) => {
            _book = {
                id: parseInt(key),
                antePost: val.ap,
                open: val.o,
                placeTerms: val.pt,
                rule4Applicable: val.r4,
                bookType: val.t
            };
        });
        return _book;
    }
    //RESOLVE THE PUSH SELECTIONS
    pushResolveSelections(selections) {
        const _selections = [];
        _.each(selections, (val, key) => {
            const selectionModel = new Backbone.Model();
            selectionModel.set({
                id: parseInt(key),
                active: val.a,
								name: val.n || '',
								sourceKey: val.sk || '',
								typeRef: val.t || '',
                price: {
                    'id': val.pid,
                    'bookId': val.bid,
                    'active': val.a,
                    'decimal': val.v,
                    'fractional': val.vf,
                    'bookType': 'PRICE'
                }
            });
            _selections.push(selectionModel);
        });
        return _selections;
    }
    //RESOLVE THE PUSH MARKET
    pushResolveMarket(market) {
        const _market = new Backbone.Model({
            id: market.id,
            active: market.a,
            state: market.ms,
            name: market.n,
            sequence: market.seq
        });
        return _market;
    }
}
const singleton = new PushService();
export {singleton as PushService};

