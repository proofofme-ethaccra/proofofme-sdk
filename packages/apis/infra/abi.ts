import { CredentialRegistryAbi, ProofOfMeAbi } from "@proofofme/contracts";
export function getProofMeABI(): any[] {
  return ProofOfMeAbi.abi;
}

export function getCredentialRegistry(): any[] {
  return CredentialRegistryAbi.abi;
}
