import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ProofOfMe", (m) => {
  // Deploy ProofOfMe with CredentialRegistry address as a constructor argument
  const proofOfMe = m.contract("ProofOfMe", [
    "0x0084d99669ecff6d6c3011ca34d734c8d1bd0eca53e49373a87d98ce5c77bad2",
    "proofofme.eth",
  ]);

  return { proofOfMe };
});
