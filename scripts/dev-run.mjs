import { emitResoureces, scanContracts } from "../dist/core/index.cjs";

console.log(scanContracts("./__tests__/fixtures/basic/base"));
console.log(emitResoureces());
