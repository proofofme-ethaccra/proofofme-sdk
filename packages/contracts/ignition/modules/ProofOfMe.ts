import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ProofOfMe", (m) => {
  const credentialRegistry = m.contract("CredentialRegistry");

  // Deploy ProofOfMe with CredentialRegistry address as a constructor argument
  const proofOfMe = m.contract("ProofOfMe", [credentialRegistry]);

  return { credentialRegistry, proofOfMe };
});
