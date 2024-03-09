class PriorityQueue {
    constructor() {
      this.queue = [];
    }
  
    enqueue(element, priority) {
      this.queue.push({ element, priority });
      this.maxHeapifyUp(this.queue.length - 1);
    }
  
    dequeue() {
      if (this.isEmpty()) {
        return null;
      }
      const maxPair = this.queue[0];
      const lastElement = this.queue.pop();
      if (!this.isEmpty()) {
        this.queue[0] = lastElement;
        this.maxHeapifyDown(0);
      }
      return maxPair;
    }
  
    front() {
      if (this.isEmpty()) {
        return "Queue is empty";
      }
      return this.queue[0].element;
    }
  
    rear() {
      if (this.isEmpty()) {
        return "Queue is empty";
      }
      return this.queue[this.queue.length - 1].element;
    }
  
    isEmpty() {
      return this.queue.length === 0;
    }
  
    print() {
      let str = "";
      for (let i = 0; i < this.queue.length; i++) {
        str += this.queue[i].element + " ";
      }
      return str;
    }
  
    getParentIndex(index) {
      return Math.floor((index - 1) / 2);
    }
  
    getLeftChildIndex(index) {
      return 2 * index + 1;
    }
  
    getRightChildIndex(index) {
      return 2 * index + 2;
    }
  
    maxHeapifyUp(index) {
      let currentIndex = index;
      let parentIndex = this.getParentIndex(currentIndex);
      while (
        currentIndex > 0 &&
        this.queue[currentIndex].priority > this.queue[parentIndex].priority
      ) {
        this.swap(currentIndex, parentIndex);
        currentIndex = parentIndex;
        parentIndex = this.getParentIndex(currentIndex);
      }
    }
  
    maxHeapifyDown(index) {
      let currentIndex = index;
      let leftChildIndex, rightChildIndex, maxIndex;
      while (true) {
        leftChildIndex = this.getLeftChildIndex(currentIndex);
        rightChildIndex = this.getRightChildIndex(currentIndex);
        maxIndex = currentIndex;
        if (
          leftChildIndex < this.queue.length &&
          this.queue[leftChildIndex].priority > this.queue[maxIndex].priority
        ) {
          maxIndex = leftChildIndex;
        }
        if (
          rightChildIndex < this.queue.length &&
          this.queue[rightChildIndex].priority > this.queue[maxIndex].priority
        ) {
          maxIndex = rightChildIndex;
        }
        if (maxIndex !== currentIndex) {
          this.swap(currentIndex, maxIndex);
          currentIndex = maxIndex;
        } else {
          break;
        }
      }
    }
  
    swap(index1, index2) {
      [this.queue[index1], this.queue[index2]] = [this.queue[index2], this.queue[index1]];
    }
  }


  module.exports = PriorityQueue; 