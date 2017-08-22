'use strict';
import Api from '../../../core__api';
import Store from './store';
import WalletEntity from '../../../entities/common/core__wallet_entity';

async function PlaceABet(render, model, totalStake) {
    try {
        await checkSession(model);
        await checkBalance(totalStake);
        const betSubmitCollection = await prepareBet(model);
        await upTodatePrices(betSubmitCollection, model);
        const betReceiptCollection = await saveBet(betSubmitCollection, model, totalStake);
        await refreshSession(betReceiptCollection);
        return render(undefined, betReceiptCollection, totalStake);
    } catch (error) {
        return render(error);
    }
}
function checkSession(model) {
    return new Promise((resolve, reject) => {
        const getUserClientSession = Api.request('util:userclient:session:get');

        if (getUserClientSession) {
            const loginData = Api.loginData;
            if (loginData) {
                model.set({
                    'deviceFingerPrint': loginData.get('deviceFingerPrint'),
                    'password': loginData.get('password'),
                    'userName': loginData.get('userName'),
                    'clientId': $('#clientId').text()
                });
            }
            return resolve(model);
        } else {

            const loginMsg = Api.request('whitelabel:global:messages', 'message', 'loginBeforeBetting');
            Api.trigger('util:userclient:session:ended:inform');
            const errorModel = new Backbone.Model({
                code: 401,
                msg: loginMsg,
                selection: '',
                data: ''
            });
            throw (errorModel);
        }
    });
}
function checkBalance(totalStake) {
    return new Promise((resolve, reject) => {
        Store.reCalculateFreebet();
        const balance = Api.request('util:userclient:session:get:balance');
        if (balance >= parseFloat(totalStake - Store.freebetsDifference)) {
            return resolve();
        } else {
            const noBalance = Api.request('sportsbook:global:messages', 'betslip', 'popupNoBalanceNotificationMsg');
            const title = Api.request('sportsbook:global:messages', 'betslip', 'popupNoBalanceNotificationTitle');
            const errorModel = new Backbone.Model({
                code: 402,
                msg: title,
                selection: '',
                data: ''
            });
            throw (errorModel);
        }
    });
}
function prepareBet(model) {
    return new Promise((resolve, reject) => {
        const betSubmitCollection = Store.BetSubmitCollection;
        betSubmitCollection.reset();

        const nostake = false;
        Store.storeCollection.map((selection) => {
            const hasUserStake = (selection.get('userStake') == 0 || selection.get('userStake') == '0' || selection.get('userStake') === '') ? false : true;
            const hasFreebet = (selection.get('selectedFreebetId') > 0) ? true : false;
            const selectionId = selection.get('selectionId');
            const spFlag = selection.get('spFlag');
            if (selection.get('zombie')) {
                Store.storeCollection.remove(selection);
                console.info('remove zombie');
            } else if (selection.get('ghost')) {
                console.info('ignore ghost');
            }
            else if (hasUserStake === false && hasFreebet === false) {
                console.info('ignore 0s');
            }
            else {
                const priceIds = [];
                let spPricesOnly = false;
                // // Multiples

                if (selection.get('multiple')) {
                    if (selection.get('betTypeRef') === 'FCS' || selection.get('betTypeRef') === 'TRI') {
                        spPricesOnly = true;
                    }
                    const filteredNonRepeatedEventSingles = Store.collection.filter((data) => {
                        return (data.get('betTypeRef') === 'SGL');
                    });
                    // Extract price IDs

                    if (spPricesOnly) {
                        filteredNonRepeatedEventSingles.map((single) => {
                            const price = single.get('price');
                            const spObj = _.findWhere(price, { bookType: 'SP' });
                            // Only SP
                            if (price.length === 1) {
                                priceIds.push(spObj.id);
                            }
                            // Has only SP or Single
                            else {
                                priceIds.push(spObj.id);
                            }
                        });
                    } else {
                        filteredNonRepeatedEventSingles.map((single) => {
                            const price = single.get('price');
                            // Has SP and Price and SP is Selected
                            const spFlag = single.get('spFlag');
                            if (spFlag) {
                                priceIds.push(price[1].id);
                            }
                            else {
                                priceIds.push(price[0].id);
                            }
                        });
                    }
                }
                // Singles
                else {

                    //ADD PRICE ID
                    const spFlag = selection.get('spFlag');
                    let priceId = null;
                    const price = selection.get('price');
                    if (spFlag) {
                        if (price.length > 1) {
                            priceId = price[1].id;
                        } else {
                            priceId = price[0].id;
                        }

                    } else {
                        priceId = price[0].id;
                    }
                    if (priceId === null || priceId === undefined) {
                        const newPriceId = selection.get('newPriceId');
                        priceIds.push(newPriceId);
                    } else {
                        priceIds.push(priceId);
                    }

                }


                let betModifierPosition = 0;
                if (selection.get('betModifierFlag')) {
                    betModifierPosition = selection.get('betModifier').length - 1;
                }

                const userStake = selection.get('userStake');

                const betModifier = selection.get('betModifier')[betModifierPosition].type;
                const totalStake = selection.get('totalStake');
                const betTypeRef = selection.get('betTypeRef');
                const walletId = selection.get('selectedFreebetId');

                if (walletId > 0) {
                    const walletModel = Store.storeCollection.wallet.findWhere({ 'id': walletId });
                    const credit = walletModel.get('credit');
                    const creditTotalStake = totalStake + parseFloat(credit);

                    betSubmitCollection.add(new Store.BetSubmitModel({
                        priceIds: priceIds,
                        betTypeRef: betTypeRef,
                        unitStake: credit,
                        totalStake: creditTotalStake,
                        betModifier: betModifier,
                        walletId: walletId,
                        selectionId: selectionId,
                        spFlag: spFlag
                    }));
                } else {
                    betSubmitCollection.add(new Store.BetSubmitModel({
                        priceIds: priceIds,
                        betTypeRef: betTypeRef,
                        unitStake: userStake,
                        totalStake: totalStake,
                        betModifier: betModifier,
                        selectionId: selectionId,
                        spFlag: spFlag
                    }));
                }
            }
        });
        if (betSubmitCollection.length > 0) {
            model.set('state', 'Pending');
            return resolve(betSubmitCollection);

        } else {
            if (Store.storeCollection.length === 1) {
                const selection = Store.storeCollection.at(0);
                const hasUserStake = (selection.get('userStake') == 0 || selection.get('userStake') == '0' || selection.get('userStake') === '') ? false : true;
                if (!hasUserStake) {
                    const errorModel = new Backbone.Model({
                        code: 403,
                        msg: 'Please enter stake greater than zero',
                        selection: '',
                        data: ''
                    });
                    throw (errorModel);
                }
            }
            const errorModel = new Backbone.Model({
                code: 403,
                msg: 'Sorry your betslip has Markets that are Currently Unavailable.',
                selection: '',
                data: ''
            });
            throw (errorModel);

        }
    });
}
async function upTodatePrices(betSubmitCollection, model) {
    return new Promise((resolve, reject) => {
        const UpTodatePrices = [];
        let isStoreNulls = false;
        let isbetSubmitNulls = false;
        //Store.storeCollection.invoke('set',{'priceId':null});
        //Store.storeCollection.invoke('set',{'price':null});
        const priceIdsfromstore = Store.storeCollection.pluck('priceId');
        const selectionIdsfromstore = Store.storeCollection.pluck('selectionId');
        isStoreNulls = priceIdsfromstore.every(function (v) { return v === null; });
        let priceIds = betSubmitCollection.pluck('priceIds');

        priceIds = priceIds.reduce(function (a, b) {
            return a.concat(b);
        }, []);
        isbetSubmitNulls = priceIds.every(function (v) { return v === null; });

        if (isStoreNulls || isbetSubmitNulls) {
            const serverData = (selectionIdsfromstore) => {
                return new Promise((resolve, reject) => {
                    let url = Api.request('sportsbook:global:api:urls', 'betslip');
                    let first = true;
                    selectionIdsfromstore.map((attribute) => {
                        if (attribute != null || attribute != undefined) {
                            if (first) {
                                url = url + '?' + 'selectionId' + '=' + attribute;
                                first = false;
                            } else {
                                url = url + '&' + 'selectionId' + '=' + attribute;
                            }
                        }
                    });
                    $.ajax({
                        url: url,
                        type: 'get',
                        dataType: 'msgpack',
                        mimeType: 'text\/plain; charset=x-user-defined',
                        responseType: 'arraybuffer',
                    })
                        .done((response) => {
                            resolve(response.response.betTemplate);
                        })
                        .fail((jqXHR, textStatus, errorThrown) => {
                            reject(errorThrown);
                        });
                });
            };
            const serverCall = serverData(selectionIdsfromstore);
            serverCall.then(serverData => {
                serverData.map((model) => {
                    if (model && model.price) {
                        const modelToUpdate = betSubmitCollection.findWhere({ 'selectionId': model.selectionId });
                        if (modelToUpdate) {
                            const spFlag = modelToUpdate.get('spFlag');
                            if (spFlag) {
                                modelToUpdate.set('priceIds', [model.price[1].id]);
                            } else {
                                modelToUpdate.set('priceIds', [model.price[0].id]);
                            }
                            modelToUpdate.unset('spFlag');
                            modelToUpdate.unset('selectionId');
                        }
                    }
                });
                model.set('br', JSON.stringify(betSubmitCollection.toJSON()));
                return resolve();
            }).catch((err) => {
                console.error(err);
            });
        }
        else {
            betSubmitCollection.models.map((model) => {
                model.unset('spFlag');
                model.unset('selectionId');
            });
            model.set('br', JSON.stringify(betSubmitCollection.toJSON()));
            return resolve();
        }
    });
}
async function saveBet(betSubmitCollection, model, totalStake) {
    return new Promise((resolve, reject) => {
        model.save({ reset: true }, {
            dataType: 'msgpack',
            mimeType: 'text\/plain; charset=x-user-defined',
            responseType: 'arraybuffer',
            success: (model, response) => {
                const betReceiptCollection = Store.BetReceiptsCollection;
                betReceiptCollection.reset();
                betReceiptCollection.add(response.response.customer.bet);
                const betReceiptSingles = betReceiptCollection.where({ multiple: false });
                let i = 0;
                betReceiptSingles.map((model) => {
                    model.set('singleCount', i);
                    i++;
                });
                const totalSinglesCount = i;
                const betReceiptMultiples = betReceiptCollection.where({ multiple: true });
                i = 0;
                betReceiptMultiples.map((model) => {
                    model.set('multipleCount', i);
                    i++;
                });
                const totalMultiplesCount = i;
                betReceiptCollection.invoke('set', { 'totalSinglesCount': totalSinglesCount });
                betReceiptCollection.invoke('set', { 'totalMultiplesCount': totalMultiplesCount });
                betReceiptCollection.balance = response.response.customer.balance;
                betReceiptCollection.totalStake = totalStake;
                setTimeout(() => resolve(betReceiptCollection), 2000);
            },
            error: (model, response) => {
                Api.handleExecuter('ajaxhelper:response:model:fail', response, model);
                const errorModel = new Backbone.Model({
                    code: 404,
                    msg: model.get('stateValue'),
                    selection: '',
                    data: ''
                });
                setTimeout(() => reject(errorModel), 2000);
            }
        });
    });
}
async function refreshSession(betReceiptCollection) {
    return new Promise((resolve, reject) => {
        Store.updateCookie('clear', '1');
        Store.collection.invoke('set', { selectedFreebetId: -1 });
        Api.trigger('util:userclient:session:update:balance', betReceiptCollection.balance);
        const creditWallets = betReceiptCollection.pluck('creditWallet');
        let hasFreebet = false;
        const isFreebet = (element) => { if (element === true) hasFreebet = true; };
        creditWallets.every(isFreebet);
        if (hasFreebet) {
            const asyncGetRefreshedSession = Api.request('util:userclient:session:refreshed');
            asyncGetRefreshedSession.then((model) => {
                const walletArray = model.get('wallet');
                if (walletArray !== undefined) {
                    const freeBetCollection = new Backbone.Collection();
                    walletArray.forEach((wallet) => {
                        const walletModelItem = WalletEntity.getWalletModel();
                        walletModelItem.set(wallet);
                        walletModelItem.format();
                        freeBetCollection.add(walletModelItem);
                    });
                    if (freeBetCollection && freeBetCollection.length > 0) {
                        Store.setWallet(freeBetCollection);
                        return resolve();
                    } else {
                        return resolve();
                    }
                } else {
                    return resolve();
                }
            });
        } else {
            return resolve();
        }
    });
}
export {
    PlaceABet
}