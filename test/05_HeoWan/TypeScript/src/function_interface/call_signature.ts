interface algoDTO {
  feature1: number,
  feature2: number,
  name: string
};

interface Altorithm {
  (dto: algoDTO, flag: boolean): {lat: number, lon: number}[]
};

const dto: algoDTO = {
  feature1: 50,
  feature2: 40,
  name: "한강코스"
}

const hello: Altorithm = (foo1, foo2) => {
  return [
    {lat: 10, lon: 20},
    {lat: 10, lon: 20},
    {lat: 10, lon: 20},
  ]
}