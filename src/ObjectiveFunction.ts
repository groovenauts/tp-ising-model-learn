import { ResponseVariable } from "./ResponseVariable";

type Term = {
    rv: ResponseVariable;
    coef: number
}

export class ObjectiveFunctions {
    terms : Term[];
    
    constructor(){
        this.terms = [];
    }

    addResponseVariable(){
        const rvs = this.terms;
        rvs.push({rv:new ResponseVariable(rvs.length,
            rvs.length > 0 ? rvs[rvs.length - 1].rv : undefined
            ), coef:1});
    }

    get responseVariable() {
        return this.terms.map(term=>term.rv);
    }

    expand() {
        return this.terms.map(term=> `${term.coef} × x${term.rv.index}` ).join(" + ");
    }

    expandQubo() {
        return this.terms.map((term:Term)=> 
            `${term.coef} × (${ term.rv.terms.map(term=>`${term.coef} × q${term.index}`).join(" + ") })`
            ).join(" + ");
    }

    expandQubo2() {
        return this.terms.map((term:Term)=> 
             term.rv.terms.map(termQ=>`${ term.coef * termQ.coef} × q${termQ.index}`).join(" + ") 
            ).join(" + ");
    }

    value() {
        return this.terms.map(term=>term.coef * term.rv.value).reduce((a,b)=> a + b, 0);
    }
}