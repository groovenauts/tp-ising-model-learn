import type { ObjectiveFunctions } from "./ObjectiveFunction";
import type {ResponseVariable} from "./ResponseVariable";

type Term = {
    coef: number;
    rv: ResponseVariable;    
}

export class QuboConstraints {
    objectiveFunction : ObjectiveFunctions;
    terms: Term[];
    _limit: number;


    constructor(objectiveFunction){
        this.objectiveFunction = objectiveFunction;
        this.terms = [];
        this._limit = 0;
        this.update();   
    }

    update(){
        this.objectiveFunction.terms.forEach(term=>{
            const isNotExist = this.terms.find(constraintsTerm=>constraintsTerm.rv === term.rv) === undefined;
            if(isNotExist){
                this.terms.push({
                    rv: term.rv,
                    coef: 0,
                });
            }
        });
    }

    get limit(){
        return this._limit;
    }

    set limit(newLimit: number){
        this._limit = newLimit;
        this.update();
    }

}