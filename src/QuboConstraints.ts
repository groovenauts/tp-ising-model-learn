import type { ObjectiveFunctions } from "./ObjectiveFunction";
import type {ResponseVariable} from "./ResponseVariable";

type Term = {
    coef: number;
    rv: ResponseVariable;    
}

export class QuboConstraints {
    objectiveFunction : ObjectiveFunctions;
    terms: Term[];
    limit: number;


    constructor(objectiveFunction){
        this.objectiveFunction = objectiveFunction;
        this.terms = [];
        this.limit = 0;
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



}