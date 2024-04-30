type QueueElement<T> = {
    user: T;
    priority: number;
    socket: any;
    matchSocket: any;
    isConnected: boolean;
};

type Comparator<T> = (a: QueueElement<T>, b: QueueElement<T>) => boolean;

export class PriorityQueue<T> {
    private _heap: QueueElement<T>[];
    private _comparator: Comparator<T>;
    private _hashTable: Map<T, number[]>;


    constructor(comparator: Comparator<T> = (a, b) => a.priority > b.priority) {
        this._heap = [];
        this._comparator = comparator;
        this._hashTable = new Map<T, number[]>();
    }

    [Symbol.iterator](): Iterator<QueueElement<T>> {
        let index = 0;

        return {
            next: (): IteratorResult<QueueElement<T>> => {
                if (index < this._heap.length) {
                    return {value: this._heap[index++], done: false};
                } else {
                    return {done: true, value: null};
                }
            }
        };
    }

    size(): number {
        return this._heap.length;
    }

    isEmpty(): boolean {
        return this.size() == 0;
    }

    peek(): QueueElement<T> {
        return this._heap[0];
    }

    peekAt(index: number): QueueElement<T> {
        return this._heap[index];
    }


    enqueue(value: T, weight: number, socket: any, matchId: any): number {
        this._heap.push({user: value, priority: weight, matchSocket: matchId, socket: socket, isConnected: false});
        let indices = this._hashTable.get(value);
        if (indices) {
            indices.push(this.size() - 1);
        } else {
            indices = [this.size() - 1];
            this._hashTable.set(value, indices);
        }
        this._siftUp();
        return this.size();
    }

    private _swap(i: number, j: number): void {
        [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
        let indicesI = this._hashTable.get(this._heap[i].user);
        if (indicesI) {
            indicesI.splice(indicesI.indexOf(j), 1);
            indicesI.push(i);
        }
        let indicesJ = this._hashTable.get(this._heap[j].user);
        if (indicesJ) {
            indicesJ.splice(indicesJ.indexOf(i), 1);
            indicesJ.push(j);
        }
    }

    dequeue(value?: T, index?: number): T | undefined {
        if (value !== undefined && index !== undefined) {
            const indices = this._hashTable.get(value);
            if (indices && indices.includes(index)) {
                const removedElement = this._heap.splice(index, 1)[0];
                indices.splice(indices.indexOf(index), 1);
                if (indices.length === 0) {
                    this._hashTable.delete(value);
                }
                this._siftDown();
                return removedElement.user;
            }
        } else {
            const poppedValue = this.pop();
            if (poppedValue) {
                let indices = this._hashTable.get(poppedValue.user);
                if (indices) {
                    indices.splice(indices.indexOf(this.size()), 1);
                    if (indices.length === 0) {
                        this._hashTable.delete(poppedValue.user);
                    }
                }
                return poppedValue.user;
            }
        }
        return undefined;
    }

    pop(): QueueElement<T> | undefined {
        const poppedValue = this.peek();
        const bottom = this.size() - 1;
        if (bottom > 0) {
            this._swap(0, bottom);
        }
        this._heap.pop();
        this._siftDown();
        return poppedValue;
    }


    replace(value: T, matchId: any): QueueElement<T> {
        const replacedValue = this.peek();
        this._heap[0] = {
            user: value,
            priority: replacedValue.priority,
            matchSocket: matchId,
            socket: replacedValue.socket,
            isConnected: false
        };
        this._siftDown();
        return replacedValue;
    }


    private _greater(i: number, j: number): boolean {
        return this._comparator(this._heap[i], this._heap[j]);
    }


    updatePriority(value: T, newWeight: number): void {
        let indices = this._hashTable.get(value);
        if (indices) {
            for (let index of indices) {
                let element = this._heap[index];
                if (element.user === value) {
                    let oldWeight = element.priority;
                    element.priority = newWeight;
                    this._hashTable.set(value, [index]);
                    if (newWeight > oldWeight) {
                        this._siftUp(index);
                    } else {
                        this._siftDown(index);
                    }
                    break;
                }
            }
        }
    }

    private _siftUp(index?: number): void {
        let node = index !== undefined ? index : this.size() - 1;
        while (node > 0 && this._greater(node, this._parent(node))) {
            this._swap(node, this._parent(node));
            node = this._parent(node);
        }
    }

    private _siftDown(index?: number): void {
        let node = index !== undefined ? index : 0;
        while (
            (this._left(node) < this.size() && this._greater(this._left(node), node)) ||
            (this._right(node) < this.size() && this._greater(this._right(node), node))
            ) {
            let maxChild = (this._right(node) < this.size() && this._greater(this._right(node), this._left(node))) ? this._right(node) : this._left(node);
            this._swap(node, maxChild);
            node = maxChild;
        }
    }

    private _parent(i: number): number {
        return ((i + 1) >>> 1) - 1;
    }

    private _left(i: number): number {
        return (i << 1) + 1;
    }

    private _right(i: number): number {
        return (i + 1) << 1;
    }
}