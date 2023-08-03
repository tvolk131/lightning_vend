import * as fs from 'fs';
import {Grammars, IToken, Parser} from 'ebnf';
import {Filter} from 'mongodb';

const grammar = fs.readFileSync(`${__dirname}/ebnf.txt`, 'utf-8');
const aipFilterRules = Grammars.Custom.getRules(grammar);
const aipProtoFilter = new Parser(aipFilterRules, {debug: false});

export class AipFilter {
  private expression?: AipExpression;

  public constructor(aipFilterText: string) {
    if (aipFilterText !== '') {
      const iToken = aipProtoFilter.getAST(aipFilterText);

      if (iToken.errors.length > 0 || iToken.type !== 'filter') {
        throw new Error('Invalid AIP filter.');
      }

      if (iToken.children.length !== 1) {
        throw new Error('Invalid AIP filter.');
      }

      this.expression = new AipExpression(iToken.children[0]);
    }
  }

  public getMongoFilter<CollectionSchema>(
  ): Filter<CollectionSchema> {
    if (!this.expression) {
      return {};
    }

    return this.expression.getMongoFilter<CollectionSchema>();
  }

  public toString(): string {
    return this.expression ? this.expression.toString() : '';
  }
}

class AipExpression {
  private sequences: AipSequence[];

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'expression') {
      throw new Error('Invalid AIP expression.');
    }

    if (iToken.children.length === 0) {
      throw new Error('Invalid AIP expression.');
    }

    this.sequences = iToken.children.map((t) => new AipSequence(t));
  }

  public getMongoFilter<CollectionSchema>(
  ): Filter<CollectionSchema> {
    if (this.sequences.length === 1) {
      return this.sequences[0].getMongoFilter();
    } else {
      return {
        $and: this.sequences.map((sequence) => sequence.getMongoFilter())
      };
    }
  }

  public parseValue(): boolean {
    for (let i = 0; i < this.sequences.length; i++) {
      if (!this.sequences[i].parseValue()) {
        return false;
      }
    }

    return true;
  }

  public toString(): string {
    return this.sequences.map((s) => s.toString()).join(' AND ');
  }
}

class AipSequence {
  private factors: AipFactor[];

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'sequence') {
      throw new Error('Invalid AIP sequence.');
    }

    if (iToken.children.length === 0) {
      throw new Error('Invalid AIP sequence.');
    }

    if (iToken.children.length > 1) {
      throw new Error('Filtering sequences are not yet supported.');
    }

    this.factors = iToken.children.map((t) => new AipFactor(t));
  }

  public getMongoFilter<CollectionSchema>(
  ): Filter<CollectionSchema> {
    if (this.factors.length === 1) {
      return this.factors[0].getMongoFilter();
    } else {
      throw new Error('Filtering sequences are not yet supported.');
    }
  }

  public parseValue(): boolean {
    if (this.factors.length !== 1) {
      throw new Error('Cannot parse value of sequence with multiple factors.');
    }

    const factor = this.factors[0];
    return factor.parseValue();
  }

  public toString(): string {
    return this.factors.map((f) => f.toString()).join(' ');
  }
}

class AipFactor {
  private terms: AipTerm[];

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'factor') {
      throw new Error('Invalid AIP factor.');
    }

    if (iToken.children.length === 0) {
      throw new Error('Invalid AIP factor.');
    }

    this.terms = iToken.children.map((t) => new AipTerm(t));
  }

  public getMongoFilter<CollectionSchema>(
  ): Filter<CollectionSchema> {
    if (this.terms.length === 1) {
      return this.terms[0].getMongoFilter();
    } else {
      return {
        $or: this.terms.map((terms) => terms.getMongoFilter())
      };
    }
  }

  public parseValue(): boolean {
    for (let i = 0; i < this.terms.length; i++) {
      if (this.terms[i].parseValue()) {
        return true;
      }
    }

    return false;
  }

  public toString(): string {
    return this.terms.map((t) => t.toString()).join(' OR ');
  }
}

class AipTerm {
  private not: boolean = false;
  private minus: boolean = false;
  private simple: AipSimple;

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'term') {
      throw new Error('Invalid AIP term.');
    }

    if (iToken.children.length === 1) {
      if (iToken.children[0].type !== 'simple') {
        throw new Error('Invalid AIP term.');
      }
      this.simple = new AipSimple(iToken.children[0]);
    } else if (iToken.children.length === 2) {
      if (iToken.children[0].type === 'MINUS') {
        this.minus = true;
      } else if (iToken.children[0].type === 'not') {
        this.not = true;
      } else {
        throw new Error('Invalid AIP term.');
      }

      if (iToken.children[1].type !== 'simple') {
        throw new Error('Invalid AIP term.');
      }
      this.simple = new AipSimple(iToken.children[1]);
    } else {
      throw new Error('Invalid AIP term.');
    }
  }

  private isNegated(): boolean {
    // TODO - See if `not` should behave different from `minus`. Right now, for
    // example, a term `-30` means `NOT 30`. Do we want this behavior? And if
    // so, how would we represent a negative number?
    return this.not || this.minus;
  }

  public parseValue(): boolean {
    let simpleValue = this.simple.parseValue();
    if (this.isNegated()) {
      simpleValue = !simpleValue;
    }
    return simpleValue;
  }

  public getMongoFilter<CollectionSchema>(
  ): Filter<CollectionSchema> {
    if (this.isNegated()) {
      throw new Error('Term negation is not yet implemented.');
    }

    return this.simple.getMongoFilter();
  }

  public toString(): string {
    return `${this.not ? 'NOT ' : ''}${this.minus ? '-' : ''}` +
           `${this.simple.toString()}`;
  }
}

class AipSimple {
  private restrictionOrComposite: AipRestriction | AipComposite;

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'simple') {
      throw new Error('Invalid AIP simple.');
    }

    if (iToken.children.length !== 1) {
      throw new Error('Invalid AIP simple.');
    }

    const child = iToken.children[0];
    if (child.type === 'restriction') {
      this.restrictionOrComposite = new AipRestriction(child);
    } else if (child.type === 'composite') {
      this.restrictionOrComposite = new AipComposite(child);
    } else {
      throw new Error('Invalid AIP simple.');
    }
  }

  public getMongoFilter<CollectionSchema>(): Filter<CollectionSchema> {
    return this.restrictionOrComposite.getMongoFilter();
  }

  public parseValue(): boolean {
    return this.restrictionOrComposite.parseValue();
  }

  public toString(): string {
    return this.restrictionOrComposite.toString();
  }
}

// TODO - Finish implementing this class.
class AipRestriction {
  private token: IToken;
  private comparable: AipComparable;
  private comparatorAndArg?: [AipComparator, AipArg];

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'restriction') {
      throw new Error('Invalid AIP restriction.');
    }

    if (iToken.children.length !== 1 && iToken.children.length !== 3) {
      throw new Error('Invalid AIP restriction.');
    }

    this.token = iToken;
    const firstChild = iToken.children[0];
    if (firstChild.type !== 'comparable') {
      throw new Error('Invalid AIP restriction.');
    }
    this.comparable = new AipComparable(firstChild);

    if (iToken.children.length === 3) {
      const secondChild = iToken.children[1];
      if (secondChild.type !== 'comparator') {
        throw new Error('Invalid AIP restriction.');
      }
      const thirdChild = iToken.children[2];
      if (thirdChild.type !== 'arg') {
        throw new Error('Invalid AIP restriction.');
      }
      this.comparatorAndArg = [
        new AipComparator(secondChild),
        new AipArg(thirdChild)
      ];
    }
  }

  public getMongoFilter<CollectionSchema>(): Filter<CollectionSchema> {
    if (this.comparatorAndArg) {
      return this.comparatorAndArg[0].getMongoFilter(
        this.comparable, this.comparatorAndArg[1]);
    } else {
      return this.comparable.getMongoFilter();
    }
  }

  public parseValue(): boolean {
    if (this.comparatorAndArg) {
      throw new Error('Parsing of comparator-based restriction values (i.e. ' +
                      'foo > 0) is not implemented yet.');
    } else {
      const comparableValue = this.comparable.parseValue();
      if (typeof comparableValue === 'boolean') {
        return comparableValue;
      } else {
        throw new Error('Cannot parse value of restriction that does not ' +
                        'evaluate to a boolean.');
      }
    }
  }

  public toString(): string {
    return `${this.comparable.toString()}${this.comparatorAndArg ? ' ' +
           this.comparatorAndArg[0].toString() + ' ' +
           this.comparatorAndArg[1].toString() : ''}`;
  }
}

class AipComposite {
  private expression: AipExpression;

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'composite') {
      throw new Error('Invalid AIP composite.');
    }

    if (iToken.children.length !== 1) {
      throw new Error('Invalid AIP composite.');
    }

    this.expression = new AipExpression(iToken.children[0]);
  }

  public getMongoFilter<CollectionSchema>(
  ): Filter<CollectionSchema> {
    return this.expression.getMongoFilter();
  }

  public parseValue(): boolean {
    return this.expression.parseValue();
  }

  public toString(): string {
    return `(${this.expression.toString()})`;
  }
}

class AipComparable {
  private memberOrFunction: AipMember | AipFunction;

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'comparable') {
      throw new Error('Invalid AIP comparable.');
    }

    if (iToken.children.length !== 1) {
      throw new Error('Invalid AIP comparable.');
    }

    const child = iToken.children[0];
    if (child.type === 'member') {
      this.memberOrFunction = new AipMember(child);
    } else if (child.type === 'function') {
      this.memberOrFunction = new AipFunction(child);
    } else {
      throw new Error('Invalid AIP comparable.');
    }
  }

  public getMember(): AipMember {
    if (this.memberOrFunction instanceof AipFunction) {
      return this.memberOrFunction.evaluate();
    } else {
      return this.memberOrFunction;
    }
  }

  public getMongoFilter<CollectionSchema>(): Filter<CollectionSchema> {
    throw new Error('Filtering by member is not implemented yet.');
  }

  // TODO - Add an explicit type definition here.
  public parseValue() {
    return this.getMember().parseValue();
  }

  public toString(): string {
    return this.memberOrFunction.toString();
  }
}

// TODO - We're repeating this list of values below - figure out how to make
// this DRY.
type ComparatorString = '<=' | '<' | '>=' | '>' | '!=' | '=' | ':';

class AipComparator {

  private token: IToken;
  private comparator: ComparatorString;

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'comparator') {
      throw new Error('Invalid AIP comparator.');
    }

    if (iToken.children.length !== 0) {
      throw new Error('Invalid AIP comparator.');
    }

    this.token = iToken;

    const comparator = iToken.text.trim();
    if (comparator === '<=' ||
        comparator === '<' ||
        comparator === '>=' ||
        comparator === '>' ||
        comparator === '!=' ||
        comparator === '=' ||
        comparator === ':') {
      this.comparator = comparator;
    } else {
      throw new Error(`Invalid or unhandled comparator: '${comparator}'`);
    }
  }

  // TODO - Add proper type definitions here.
  public getMongoFilter(
    comparable: AipComparable, arg: AipArg
  ): any {
    const parsedComparableValue = comparable.parseValue();
    if (typeof parsedComparableValue === 'boolean') {
      throw new Error('Cannot filter using a comparator-based restriction ' +
                      'with a boolean value on the left side.');
    }

    const parsedArgValue = arg.parseValue();

    if (this.comparator === '<=') {
      return {[parsedComparableValue]: {$lte: parsedArgValue}};
    } else if (this.comparator === '<') {
      return {[parsedComparableValue]: {$lt: parsedArgValue}};
    } else if (this.comparator === '>=') {
      return {[parsedComparableValue]: {$gte: parsedArgValue}};
    } else if (this.comparator === '>') {
      return {[parsedComparableValue]: {$gt: parsedArgValue}};
    } else if (this.comparator === '!=') {
      return {[parsedComparableValue]: {$ne: parsedArgValue}};
    } else if (this.comparator === '=') {
      return {[parsedComparableValue]: {$eq: parsedArgValue}};
    } else if (this.comparator === ':') {
      throw new Error(`Filtering by comparator '${this.comparator}' is not ` +
                      'implemented yet.');
    } else {
      throw new Error(`Filtering by comparator '${this.comparator}' is not ` +
                      'implemented yet.');
    }
  }

  public toString(): string {
    return this.comparator;
  }
}

class AipArg {
  private token: IToken;
  private comparableOrComposite: AipComparable | AipComposite;

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'arg') {
      throw new Error('Invalid AIP arg.');
    }

    if (iToken.children.length !== 1) {
      throw new Error('Invalid AIP arg.');
    }

    this.token = iToken;
    const child = iToken.children[0];
    if (child.type === 'comparable') {
      this.comparableOrComposite = new AipComparable(child);
    } else if (child.type === 'composite') {
      this.comparableOrComposite = new AipComposite(child);
    } else {
      throw new Error('Invalid AIP arg.');
    }
  }

  // TODO - Add an explicit type definition here. Also look into whether this
  // can be parsed into more types.
  public parseValue() {
    if (this.comparableOrComposite instanceof AipComparable) {
      return this.comparableOrComposite.getMember().parseValue();
    } else {
      return this.comparableOrComposite.parseValue();
    }
  }

  public toString(): string {
    return this.comparableOrComposite.toString();
  }
}

class AipArgList {
  private token: IToken;
  private args: AipArg[];

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'argList') {
      throw new Error('Invalid AIP arg list.');
    }

    this.token = iToken;
    this.args = [];
    for (const child of iToken.children) {
      if (child.type !== 'arg') {
        throw new Error('Invalid AIP arg list.');
      }
      this.args.push(new AipArg(child));
    }
  }

  public toString(): string {
    return this.args.map(arg => arg.toString()).join(', ');
  }
}

class AipMember {
  private token: IToken;
  private value: AipValue;
  private fields: AipField[];

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'member') {
      throw new Error('Invalid AIP member.');
    }

    if (iToken.children.length < 1) {
      throw new Error('Invalid AIP member.');
    }

    this.token = iToken;
    this.value = new AipValue(iToken.children[0]);
    this.fields = [];
    for (let i = 1; i < iToken.children.length; i++) {
      const child = iToken.children[i];
      if (child.type !== 'field') {
        throw new Error('Invalid AIP member.');
      }
      this.fields.push(new AipField(child));
    }
  }

  public parseValue() {
    const memberString = this.toString();

    if (memberString === 'true') {
      return true;
    } else if (memberString === 'false') {
      return false;
    } else {
      // TODO - There are more parsable types here.
      return memberString;
    }
  }

  public toString(): string {
    return `${this.value.toString()}${this.fields.map((field) => {
      return '.' + field.toString();
    }).join('')}`;
  }
}

class AipFunction {
  private token: IToken;
  private dottedName: string;
  private argList?: AipArgList;

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'function') {
      throw new Error('Invalid AIP function.');
    }

    if (iToken.children.length < 1) {
      throw new Error('Invalid AIP function.');
    }

    this.token = iToken;

    const lastChild = iToken.children[iToken.children.length - 1];
    if (lastChild.type === 'argList') {
      // Iterate over all children _except the last one_, which is the argList.
      this.dottedName = '';
      for (let i = 0; i < iToken.children.length - 1; i++) {
        const child = iToken.children[i];
        if (child.type !== 'name') {
          throw new Error('Invalid AIP function.');
        }
        if (this.dottedName.length > 0) {
          this.dottedName += '.';
        }
        this.dottedName += child.text;
      }
      this.argList = new AipArgList(lastChild);
    } else {
      // Iterate over all children, since there is no argList.
      this.dottedName = '';
      for (let i = 0; i < iToken.children.length; i++) {
        const child = iToken.children[i];
        if (child.type !== 'name') {
          throw new Error('Invalid AIP function.');
        }
        if (this.dottedName.length > 0) {
          this.dottedName += '.';
        }
        this.dottedName += child.text;
      }
    }
  }

  public evaluate(): AipMember {
    throw new Error('Function-based filtering is not yet implemented.');
  }

  public toString(): string {
    return `${this.dottedName}(${this.argList ? this.argList.toString() : ''})`;
  }
}

class AipValue {
  private token: IToken;
  private value: string;

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'value') {
      throw new Error('Invalid AIP value.');
    }

    if (iToken.children.length !== 0) {
      throw new Error('Invalid AIP value.');
    }

    this.token = iToken;
    this.value = iToken.text;
  }

  public toString(): string {
    return this.value;
  }
}

class AipField {
  private token: IToken;
  private valueOrKeyword: AipValue | AipKeyword;

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'field') {
      throw new Error('Invalid AIP field.');
    }

    if (iToken.children.length !== 1) {
      throw new Error('Invalid AIP field.');
    }

    this.token = iToken;
    const child = iToken.children[0];
    if (child.type === 'value') {
      this.valueOrKeyword = new AipValue(child);
    } else if (child.type === 'keyword') {
      this.valueOrKeyword = new AipKeyword(child);
    } else {
      throw new Error('Invalid AIP field.');
    }
  }

  public toString(): string {
    return this.valueOrKeyword.toString();
  }
}

class AipKeyword {
  private token: IToken;
  private keyword: string;

  public constructor(iToken: IToken) {
    if (iToken.errors.length > 0 || iToken.type !== 'keyword') {
      throw new Error('Invalid AIP keyword.');
    }

    if (iToken.children.length !== 0) {
      throw new Error('Invalid AIP keyword.');
    }

    this.token = iToken;
    // TODO - Check that the keyword is valid.
    this.keyword = iToken.text;
  }

  public toString(): string {
    return this.keyword;
  }
}


// const stringifyRecursive = (
//   token: IToken,
//   itemToPrint: (token: IToken) => string,
//   level = 0
// ) => {
//   let string = itemToPrint(token);
//   token.children.forEach((t) => {
//     let line = '\n';
//     for (let i = 0; i < level; i++) {
//       line += '  ';
//     }
//     line += stringifyRecursive(t, itemToPrint, level + 1);
//     string += line;
//   });
//   return string;
// };
