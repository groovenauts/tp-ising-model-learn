export class ResponseVariable {
  index: number;
  _max: number;
  binaryCounts: number;
  terms: {
    coef: number;
    value: number;
    index: number;
  }[];
  prevRV: ResponseVariable;
  nextRV: ResponseVariable;

  constructor(index: number, prevRV: ResponseVariable = undefined) {
    this.index = index;
    this._max = 5;
    this.terms = [];
    this.binaryCounts = 0;
    this.prevRV = prevRV;
    if(prevRV){
        prevRV.nextRV = this;
    }
    this.update();
  }

  update() {
    let newBinaryCounts = Math.ceil(Math.log2(this._max + 1));
    if (newBinaryCounts == this.binaryCounts) {
      
    } else if (newBinaryCounts > this.binaryCounts) {
      for (let i = 0; i < newBinaryCounts - this.binaryCounts; i++) {
        let newIndex = i + this.binaryCounts;
        this.terms.push({
          coef: Math.pow(2, i),
          value: 0,
          index: newIndex,
        });
      }
    } else {
      this.terms.splice(newBinaryCounts - this.binaryCounts);
    }
    this.binaryCounts = newBinaryCounts;

    if(this.prevRV === undefined){
        for (let i = 0; i < this.binaryCounts; i++) {
            this.terms[i].index = i;
        }
    }else{
        const prevRVTerms = this.prevRV.terms;
        const baseIndex = prevRVTerms[prevRVTerms.length - 1].index + 1;
        for (let i = 0; i < this.binaryCounts; i++) {
            this.terms[i].index = i + baseIndex;
        }
    }

    this.nextRV?.update();
  }

  get max() {
    return this._max;
  }

  set max(value: number) {
    this._max = value;
    this.update();
  }

  get value() {
    return this.terms.map((term) => term.value * term.coef).reduce(
      (a, b) => a + b,
      0,
    );
  }

  expandQubo(): string {
    let text = "";
    for (let i = 0; i < this.binaryCounts; i++) {
      text += `${Math.pow(2, i)}×q${this.terms[i].index} + `;
    }
    text = text.slice(0, -2);
    return text;
  }
}
