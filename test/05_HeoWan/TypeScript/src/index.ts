let value: number = 1

// value = "2"

// value = "2"

function func(a: number, b: string): object {
  return { name: "hello" }
}

// func("1", 1)

type User = {
  id: number;
  name: string;
  age: number;
}

type Team = {
  id: number;
  name: string;
  member: User[];
  strenght: number;
  // `?`을 이용해서 Optional을 줄 수 있습니다.
  meta?: object;
}

const user1: User = {
  id: 1,
  name: "철수",
  age: 22
}

const user2: User = {
  id: 2,
  name: "영수",
  age: 21
}

const team: Team = {
  id: 1,
  name: "한국",
  member: [user1, user2],
  strenght: 20,
  meta: {
    feature: "교과서에 많이 나옴"
  },
}


type status = "PENDING" | "READY" | "ONGOING" | "FINISHED"

// const req1: status = "LOADING"
const req2: status = "READY"


type StrNum = string | 1 | 2 

const a: StrNum = 1
const b: StrNum = "str"
// const c: StrNum = 3

type TypeArr = [number, string, object, 2, "3", null]

// const tpArr1: TypeArr = [123, "123", {}, 2, "3", null]
// const tpArr2: TypeArr = [123, "123", {}, 2, 3, null]

console.log(a, b)




// const tpArr3: TypeArr = [123, "123", null, 2, "3", 123]