import {expect,it} from "vitest";
import {visibleProduct,retiredService,retiredVehicle,isAlibabaCom} from "./launch-policy";
import retired from "./retired-listings.json";
it("removes only the named test listings and retired vehicles",()=>{
 for(const id of retired.products)expect(visibleProduct({id})).toBe(false);
 for(const id of retired.services)expect(retiredService(id)).toBe(true);
 for(const id of retired.vehicles)expect(retiredVehicle(id)).toBe(true);
 expect(visibleProduct({id:"new-bright-product"})).toBe(true);
 expect(retiredService("new-patrick-service")).toBe(false);
 expect(retiredVehicle("new-reviewed-car")).toBe(false);
});
it("excludes Alibaba.com without excluding Taobao, JD or 1688",()=>{
 expect(visibleProduct({id:"old",specs:{supplierListing:"https://www.alibaba.com/product-detail/test.html"}})).toBe(false);
 for(const domain of ["item.taobao.com","item.jd.com","detail.1688.com"]){
  expect(isAlibabaCom(`https://${domain}/item`)).toBe(false);
  expect(visibleProduct({id:"reviewed",sourceUrl:`https://${domain}/item`})).toBe(true);
 }
});
