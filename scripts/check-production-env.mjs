import { productionEnvironmentErrors } from "../lib/deployment/production-env.js";

const errors = productionEnvironmentErrors(process.env);
if (errors.length > 0) {
  console.error(`Production 환경변수 검증 실패:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log("Production 환경변수 검증 완료");
