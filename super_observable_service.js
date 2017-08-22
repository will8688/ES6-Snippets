import { Subject } from 'rx';

class SuperObservableService {
    constructor(serviceName){
        
        this.serviceName = serviceName;
        console.info(this.serviceName + ' running...');
        this.subjects = {};
    }
    emit (name, data) {
        //console.warn('PriceToggleService > Emitting ...', name);
        const fnName = this.createName(name);
        this.subjects[fnName] || (this.subjects[fnName] = new Subject());
        this.subjects[fnName].onNext(data);
    }
    listen (name, handler) {
        console.warn(this.serviceName + ' > listener attached ...', name);
        const fnName = this.createName(name);
        this.subjects[fnName] || (this.subjects[fnName] = new Subject());
        return this.subjects[fnName].subscribe(handler);
    }
    close (name) {
        const subjects = this.subjects;
        const channel = this.subjects[this.getName(name)];
        if(channel){
            console.warn(this.serviceName + ' Channel closed ...', name);
            channel.onCompleted();
        }
    }
    createName (name){
        return '$' + name;
    }
    getName (name){
        return '$' + name;
    }
}


export default SuperObservableService