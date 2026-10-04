// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NegotiateDialog } from "./NegotiateDialog";
const mocks = vi.hoisted(() => ({ sendOffer: vi.fn(), start: vi.fn(), toast: vi.fn(), navigate: vi.fn() }));
vi.mock("wouter", () => ({useLocation:()=>["/services",mocks.navigate]}));
vi.mock("@/contexts/AuthContext",()=>({useAuth:()=>({user:{id:"buyer",name:"Buyer"}})}));
vi.mock("@/contexts/AuthModalContext",()=>({useAuthModal:()=>vi.fn()}));
vi.mock("@/contexts/MessagesContext",()=>({useMessages:()=>({sendOffer:mocks.sendOffer,startConversation:mocks.start})}));
vi.mock("@/hooks/use-toast",()=>({useToast:()=>({toast:mocks.toast})}));
beforeEach(()=>{vi.resetAllMocks();mocks.start.mockResolvedValue("thread");mocks.sendOffer.mockResolvedValue(undefined)});
afterEach(cleanup);
const service={id:"service",title:"Design",provider:"Provider",providerId:"provider",avatar:"",hourlyRate:20};
function fill(mode:"hourly"|"contract") {
 render(<NegotiateDialog service={service} billingMode={mode}/>);
 fireEvent.click(screen.getByRole("button",{name:"Negotiate"}));
 fireEvent.change(screen.getByLabelText("What would you like to negotiate?"),{target:{value:"Design five pages"}});
 fireEvent.change(screen.getByLabelText(mode==="hourly"?"Number of hours":"Contract duration (days)"),{target:{value:"5"}});
 fireEvent.change(screen.getByLabelText(mode==="hourly"?"Proposed hourly rate (£)":"Total contract budget (£)"),{target:{value:"20"}});
 fireEvent.click(screen.getByRole("button",{name:"Send offer"}));
}
it("sends a five-day contract with a fixed total, not a daily multiplier",async()=>{
 fill("contract");
 await waitFor(()=>expect(mocks.sendOffer).toHaveBeenCalledWith("thread",expect.objectContaining({amount:20,description:expect.stringContaining("5 day(s)")}),"buyer","Buyer"));
});
it("calculates the hourly budget and carries the duration into the offer",async()=>{
 fill("hourly");
 await waitFor(()=>expect(mocks.sendOffer).toHaveBeenCalledWith("thread",expect.objectContaining({amount:100,description:expect.stringContaining("5 hour(s)")}),"buyer","Buyer"));
});
it("reports failure instead of claiming an unsaved offer was sent",async()=>{
 mocks.sendOffer.mockRejectedValue(new Error("offline"));fill("contract");
 await waitFor(()=>expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({title:"Couldn't send offer"})));
 expect(mocks.navigate).not.toHaveBeenCalled();
});
