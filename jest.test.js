/* eslint no-undef: 0 */
import { Collection, Model } from 'backbone';

import Store from './core__store_local_storage.js';
import { Entity } from '../../../entities/sportsbook/core__sport_betslip_entity';  
describe('core__store.js', () => {
  let response;
  let store;
  const Storage = class {
    constructor() {
        const jsonbetslip = JSON.parse('[{"betCount":1,"betModifier":[{"betCount":1,"fractionalReturns":"2/1","returns":3,"type":"WIN"}],"betTypeRef":"SGL","description":"Football|Premier League|Relegation|Relegation - Outright","marketId":123456,"multiple":false,"name":"Middlesbrough FC","price":[{"bookId":569252,"bookType":"PRICE","current":true,"decimal":3,"fractional":"2/1","id":40877081}],"repeatedEvent":false,"returns":1,"selectionId":3648836,"priceText":"","wallet":null,"walletChangeFlag":false,"returnsText":"","userStake":0,"betModifierFlag":false,"spFlag":false,"ewFlag":false,"pushUpdate":false,"active":true,"priceFormat":"fractional","inputReset":false,"longname1":"Premier League","longname2":"Relegation","longname3":"Relegation - Outright","priceBookId":569252,"priceBookType":"PRICE","priceCurrent":true,"priceDecimal":3,"priceFractional":"2/1","priceId":40877081,"returnFractional":"2/1","returnType":"WIN","ghost":false,"zombie":false}]');
        this.storageCollection = Entity.getSelectionCollection();
        this.storageCollection.set(jsonbetslip);
    }
    loadStorage() {
        return this.storageCollection;
    }
    saveToStorage(collection) {
        return 'saved!';
    }
    resetStorage() {
        return 'cleared';
    }
};
  beforeEach(() => {
    response = {
      'betTemplate': [
          {
              'betModifier': [
                  {
                      'betCount': 1,
                      'returns': 1.46,
                      'fractionalReturns': '23/50',
                      'type': 'WIN'
                  }
              ],
              'price': [
                  {
                      'id': 42641623,
                      'bookId': 645629,
                      'current': true,
                      'bookType': 'PRICE',
                      'decimal': 1.46,
                      'fractional': '23/50'
                  }
              ],
              'selectionId': 3851395,
              'marketId': 365286,
              'returns': 1,
              'repeatedEvent': true,
              'multiple': false,
              'betTypeRef': 'SGL',
              'betCount': 1,
              'name': 'GlobalPort Batang Pier',
              'description': 'Basketball|Philippines PBA|GlobalPort Batang Pier v Blackwater Elite|Match Result (Inc OT)'
              , 'ghost': false
              , 'zombie': false
          },
          {
              'betModifier': [
                  {
                      'betCount': 1,
                      'returns': 2.56,
                      'fractionalReturns': '39/25',
                      'type': 'WIN'
                  }
              ],
              'price': [
                  {
                      'id': 42641624,
                      'bookId': 645629,
                      'current': true,
                      'bookType': 'PRICE',
                      'decimal': 2.56,
                      'fractional': '39/25'
                  }
              ],
              'selectionId': 3851396,
              'marketId': 365286,
              'returns': 1,
              'repeatedEvent': true,
              'multiple': false,
              'betTypeRef': 'SGL',
              'betCount': 1,
              'name': 'Blackwater Elite',
              'description': 'Basketball|Philippines PBA|GlobalPort Batang Pier v Blackwater Elite|Match Result (Inc OT)'
              , 'ghost': false
              , 'zombie': false
          }, {
              'betModifier': [
                  {
                      'betCount': 1,
                      'returns': 2.56,
                      'fractionalReturns': '39/25',
                      'type': 'WIN'
                  }
              ],
              'price': [
                  {
                      'id': 42641624,
                      'bookId': 645629,
                      'current': true,
                      'bookType': 'PRICE',
                      'decimal': 2.56,
                      'fractional': '39/25'
                  }
              ],
              'multiple': true,
              'marketId': 365286,
              'returns': 1,
              'repeatedEvent': true,
              'betTypeRef': 'DBL',
              'betCount': 1,
              'name': 'Blackwater Elite',
              'description': 'Basketball|Philippines PBA|GlobalPort Batang Pier v Blackwater Elite|Match Result (Inc OT)'
              , 'ghost': false
              , 'zombie': false
          }
      ]
    };
    store = new Store();
    store.storage = new Storage();
  });
  
  describe('loadStore()', () => {
    test('expect loadStore() to call serverData() ', () => {
      const spyLoadStore = jest.spyOn(store, 'loadStore');
      const spyServerData = jest.spyOn(store, 'serverData');
      store.loadStore();
      expect(spyServerData).toHaveBeenCalled();
      spyLoadStore.mockReset();
      spyLoadStore.mockRestore();
    });
    test('expect loadStore() to call syncStore()', () => {
      
      const spySyncStore = jest.spyOn(store, 'syncStore');
      const serverData = new Promise((resolve, reject) => {
        resolve(response.betTemplate);
      });
      store.loadStore();
      expect(spySyncStore).toHaveBeenCalled();
      spySyncStore.mockReset();
      spySyncStore.mockRestore();
    });

  });
  
});
