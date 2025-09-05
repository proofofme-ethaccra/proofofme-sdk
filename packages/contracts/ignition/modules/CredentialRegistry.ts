import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CredentialRegistry", (m) => {
  const credentialRegistry = m.contract("CredentialRegistry");

  return { credentialRegistry };
});
