// What this file does: max-heap data structure for surfacing hottest leads by intent score
// Always keeps the highest intentScore enquiry at index 0 (top of heap)

class MaxHeap {
  constructor() {
    this.heap = [];
  }

  // Returns the current size of the heap
  size() {
    return this.heap.length;
  }

  // Peeks at the top (max) element without removing it
  peek() {
    return this.heap[0] || null;
  }

  // Inserts a new enquiry into the heap and maintains heap property
  insert(enquiry) {
    this.heap.push(enquiry);
    this._heapifyUp(this.heap.length - 1);
  }

  // Removes and returns the enquiry with the highest intent score
  extractMax() {
    if (this.heap.length === 0) return null;
    const max = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._heapifyDown(0);
    }
    return max;
  }

  // Bubbles an element up until the heap property is satisfied
  _heapifyUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent].intentScore < this.heap[index].intentScore) {
        [this.heap[parent], this.heap[index]] = [this.heap[index], this.heap[parent]];
        index = parent;
      } else break;
    }
  }

  // Pushes an element down until the heap property is satisfied
  _heapifyDown(index) {
    const n = this.heap.length;
    while (true) {
      let largest = index;
      const left  = 2 * index + 1;
      const right = 2 * index + 2;

      if (left  < n && this.heap[left].intentScore  > this.heap[largest].intentScore) largest = left;
      if (right < n && this.heap[right].intentScore > this.heap[largest].intentScore) largest = right;

      if (largest !== index) {
        [this.heap[largest], this.heap[index]] = [this.heap[index], this.heap[largest]];
        index = largest;
      } else break;
    }
  }

  // Builds a sorted array from all enquiries, highest score first
  toSortedArray() {
    const copy = new MaxHeap();
    this.heap.forEach(e => copy.insert(e));
    const result = [];
    while (copy.size() > 0) result.push(copy.extractMax());
    return result;
  }
}

module.exports = MaxHeap;
