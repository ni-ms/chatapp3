type QueueElement<T> = {
    value: T;
    weight: number;
};

type Comparator<T> = (a: QueueElement<T>, b: QueueElement<T>) => boolean;

export class PriorityQueue<T> {
    private _heap: QueueElement<T>[];
    private _comparator: Comparator<T>;
    private _hashTable: Map<T, number[]>;

    constructor(comparator: Comparator<T> = (a, b) => a.weight > b.weight) {
        this._heap = [];
        this._comparator = comparator;
        this._hashTable = new Map<T, number[]>();
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

    enqueue(value: T, weight: number): number {
        this._heap.push({value, weight});
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
        let indicesI = this._hashTable.get(this._heap[i].value);
        if (indicesI) {
            indicesI.splice(indicesI.indexOf(j), 1);
            indicesI.push(i);
        }
        let indicesJ = this._hashTable.get(this._heap[j].value);
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
                return removedElement.value;
            }
        } else {
            const poppedValue = this.pop();
            if (poppedValue) {
                let indices = this._hashTable.get(poppedValue.value);
                if (indices) {
                    indices.splice(indices.indexOf(this.size()), 1);
                    if (indices.length === 0) {
                        this._hashTable.delete(poppedValue.value);
                    }
                }
                return poppedValue.value;
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


    replace(value: T): QueueElement<T> {
        const replacedValue = this.peek();
        this._heap[0] = {value, weight: replacedValue.weight};
        this._siftDown();
        return replacedValue;
    }


    private _greater(i: number, j: number): boolean {
        return this._comparator(this._heap[i], this._heap[j]);
    }


    private _siftUp(): void {
        let node = this.size() - 1;
        while (node > 0 && this._greater(node, this._parent(node))) {
            this._swap(node, this._parent(node));
            node = this._parent(node);
        }
    }

    private _siftDown(): void {
        let node = 0;
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