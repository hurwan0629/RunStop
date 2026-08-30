// === [Interface Duplicate] ===
interface User {
  id: number;
};

interface User {
  name: string;
};

const user1: User = {
  id: 1,
  name: "홍길동"
}


// === [Type Duplicate] ===
// type Item = {
//   id: number;
// };






// type Item = {
//   name: string;
// };

// const item1: Item = {
//   id: 1,
//   name: "아이템"
// }