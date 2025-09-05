// Import the ABI
import ProofOfMeContract from "./artifacts/contracts/ProofOfMe.sol/ProofOfMe.json";
import CredentialRegistry from "./artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json";
// Export the ABI
export const ProofOfMeAbi = ProofOfMeContract;
export const CredentialRegistryAbi = CredentialRegistry;
// Default export if needed
export default {
  ProofOfMeAbi,
  CredentialRegistryAbi,
};
