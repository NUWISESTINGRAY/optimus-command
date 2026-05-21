import optimus from "@/assets/agents/optimus.jpg";
import athena from "@/assets/agents/athena.jpg";
import cipher from "@/assets/agents/cipher.jpg";
import nova from "@/assets/agents/nova.jpg";
import atlas from "@/assets/agents/atlas.jpg";
import victoria from "@/assets/agents/victoria.jpg";
import sentinel from "@/assets/agents/sentinel.jpg";
import aaron from "@/assets/agents/aaron.jpg";
import mark from "@/assets/agents/mark.jpg";
import cody from "@/assets/agents/cody.jpg";
import patty from "@/assets/agents/patty.jpg";
import vicky from "@/assets/agents/vicky.jpg";
import jerry from "@/assets/agents/jerry.jpg";
import dolly from "@/assets/agents/dolly.jpg";
import maya from "@/assets/agents/maya.jpg";
import angelina from "@/assets/agents/angelina.jpg";
import frannie from "@/assets/agents/frannie.jpg";

export const AGENT_AVATARS: Record<string, string> = {
  optimus, athena, cipher, nova, atlas, victoria, sentinel,
  aaron, mark, cody, patty, vicky, jerry, dolly, maya, angelina, frannie,
};

export function agentAvatar(codename?: string | null): string | undefined {
  if (!codename) return undefined;
  return AGENT_AVATARS[codename];
}