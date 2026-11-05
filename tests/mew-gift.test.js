import test from "node:test";
import assert from "node:assert/strict";
import {createProfile,claimMewGift,saveProfile,loadProfile} from "../src/js/progression-model.js";

test("le cadeau ajoute dix Mew sans changer le deck, l’or ou la progression",()=>{
  const before={...createProfile(),coins:220,xp:125,characterId:"milo"};
  const after=claimMewGift(before);
  assert.deepEqual(after.collection[151],{copies:10,level:1,xp:0});
  const {claimedGifts,collection,...rest}=after;
  const {collection:oldCollection,...oldRest}=before;
  assert.deepEqual(rest,oldRest);
  assert.deepEqual(Object.fromEntries(Object.entries(collection).filter(([id])=>id!=="151")),oldCollection);
  assert.equal(before.collection[151],undefined);
});
test("le cadeau conserve le niveau de Mew et ajoute dix exemplaires aux cartes déjà possédées",()=>{
  const before=createProfile();before.collection[151]={copies:3,level:4};
  assert.deepEqual(claimMewGift(before).collection[151],{copies:13,level:4,xp:300});
  assert.deepEqual(before.collection[151],{copies:3,level:4});
});
test("le cadeau est conservé et ne se répète pas après rechargement",()=>{
  let value=null;const storage={getItem:()=>value,setItem:(_key,next)=>{value=next;}};
  const once=claimMewGift(createProfile());saveProfile(storage,once);
  const restored=loadProfile(storage);assert.deepEqual(restored,once);
  assert.equal(claimMewGift(restored),restored);
  assert.equal(restored.collection[151].copies,10);
});
