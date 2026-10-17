import {expect,it} from "vitest";
import {visibleProduct,retiredService,retiredVehicle} from "./launch-policy";
import retired from "./retired-listings.json";
it("removes only the named test listings and retired vehicles",()=>{
 for(const id of retired.products)expect(visibleProduct({id})).toBe(false);
 for(const id of retired.services)expect(retiredService(id)).toBe(true);
 for(const id of retired.vehicles)expect(retiredVehicle(id)).toBe(true);
 expect(visibleProduct({id:"new-bright-product"})).toBe(true);
 expect(retiredService("new-patrick-service")).toBe(false);
 expect(retiredVehicle("new-reviewed-car")).toBe(false);
});
it("leaves vehicle publication to the database, so a published car shows",()=>{
 // The Audi Q5 was a launch-retired demo vehicle until it was republished.
 expect(retiredVehicle("cfc754b6-eb34-4613-8ece-4f9b088a774a")).toBe(false);
});
it("shows published listings from any supplier, Alibaba included",()=>{
 for(const id of ["3cb361ca-4fad-576e-8147-e3a4b081b7d2","1688-973074422128","taobao-1"])expect(visibleProduct({id})).toBe(true);
});
