// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import {
  AuthProvider,
  useAuth,
  SESSION_EVENT_KEY,
  type User,
} from "./AuthContext";
import { SessionScope, SessionNotice } from "./SessionScope";
import { MessagesProvider, useMessages } from "./MessagesContext";
import { CartProvider, useCart } from "./CartContext";
import { RequireSession } from "@/components/common/RequireSession";
import { authService } from "@/features/auth/services";
import { messagesService } from "@/features/messaging/services";

vi.mock("@/features/auth/services", () => ({
  authService: {
    getSession: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    login: vi.fn(),
    signup: vi.fn(),
    clearSession: vi.fn(),
    saveSession: vi.fn(),
    loginWithGoogle: vi.fn(),
    completeGoogleSignup: vi.fn(),
  },
}));
vi.mock("@/features/messaging/services", () => ({
  messagesService: {
    listConversations: vi.fn(),
    markAsRead: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock("wouter", () => ({
  Redirect: ({ to }: { to: string }) => <span>redirect:{to}</span>,
  useLocation: () => ["/dashboard/manager", vi.fn()],
}));
const openAuth = vi.hoisted(() => vi.fn());
vi.mock("@/contexts/AuthModalContext", () => ({ useAuthModal: () => openAuth }));
vi.mock("@/api", () => ({ MESSAGES_USE_MOCKS: false, AUTH_USE_MOCKS: false }));
// Every account starts with an empty saved cart on the server.
vi.mock("@/services/cart.service", () => ({
  cartService: {
    list: vi.fn(async () => []),
    merge: vi.fn(async () => []),
    setQuantity: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    clear: vi.fn(async () => undefined),
  },
}));
const alice: User = {
  id: "alice",
  name: "Alice",
  email: "alice@example.com",
  role: "buyer",
  joinedAt: "2026-01-01",
  verified: true,
};
const bob: User = {
  ...alice,
  id: "bob",
  name: "Bob",
  email: "bob@example.com",
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
let session!: ReturnType<typeof useAuth>;
const orderFetch = vi.fn<() => Promise<string[]>>();
function Probe() {
  session = useAuth();
  const { conversations } = useMessages();
  const cart = useCart();
  // Deliberately reuse a key to prove even a missed key namespace cannot leak
  // through the account boundary. Production private hooks also include user IDs.
  const orders = useQuery({
    queryKey: ["private-orders"],
    queryFn: orderFetch,
    enabled: session.isAuthenticated,
  });
  return (
    <>
      <span data-testid="identity">{session.user?.id ?? "anonymous"}</span>
      <span data-testid="status">{session.status}</span>
      <span data-testid="orders">{(orders.data ?? []).join(",")}</span>
      <span data-testid="messages">
        {conversations.map((c) => c.subject).join(",")}
      </span>
      <span data-testid="cart">{cart.count}</span>
      <button
        onClick={() =>
          cart.addItem({
            id: "p",
            productId: "p",
            title: "Item",
            price: 1,
            image: "",
            seller: "Seller",
          })
        }
      >
        Add item
      </button>
    </>
  );
}
function Harness({
  guarded = false,
  staff = false,
}: {
  guarded?: boolean;
  staff?: boolean;
}) {
  return (
    <AuthProvider>
      <SessionNotice />
      <SessionScope>
        <MessagesProvider>
          <CartProvider>
            <Probe />
            {guarded && (
              <RequireSession roles={staff ? ["manager"] : undefined}>
                <div>private-page</div>
              </RequireSession>
            )}
          </CartProvider>
        </MessagesProvider>
      </SessionScope>
    </AuthProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.getSession).mockResolvedValue(null);
  vi.mocked(authService.clearSession).mockResolvedValue(undefined);
  vi.mocked(authService.login).mockImplementation(async (email) =>
    email === alice.email ? alice : bob,
  );
  vi.mocked(messagesService.listConversations).mockResolvedValue([]);
  orderFetch.mockResolvedValue([]);
});
afterEach(cleanup);

describe("session lifecycle and private state", () => {
  it("waits for session restoration instead of redirecting a valid user", async () => {
    const pending = deferred<User | null>();
    vi.mocked(authService.getSession).mockReturnValue(pending.promise);
    render(<Harness guarded />);
    expect(screen.queryByText("redirect:/")).toBeNull();
    expect(openAuth).not.toHaveBeenCalled();
    expect(screen.queryByText("private-page")).toBeNull();
    expect(messagesService.listConversations).not.toHaveBeenCalled();
    await act(async () => pending.resolve(alice));
    expect(screen.getByText("private-page")).toBeTruthy();
  });
  it("asks a signed-out visitor to sign in and returns them to the private page", async () => {
    render(<Harness guarded />);
    await screen.findByText("redirect:/");
    expect(screen.queryByText("private-page")).toBeNull();
    expect(openAuth).toHaveBeenCalledWith("signin", "/dashboard/manager");
  });
  it("never mounts staff content for a buyer", async () => {
    vi.mocked(authService.getSession).mockResolvedValue(alice);
    render(<Harness guarded staff />);
    await screen.findByText("redirect:/dashboard/buyer");
    expect(screen.queryByText("private-page")).toBeNull();
  });
  it("ignores a stale bootstrap response after a new login", async () => {
    const pending = deferred<User | null>();
    vi.mocked(authService.getSession).mockReturnValue(pending.promise);
    render(<Harness />);
    await act(async () => {
      await session.login(bob.email, "password");
    });
    await act(async () => pending.resolve(alice));
    expect(screen.getByTestId("identity").textContent).toBe("bob");
  });
  it("ignores a stale bootstrap response after logout", async () => {
    const pending = deferred<User | null>();
    vi.mocked(authService.getSession).mockReturnValue(pending.promise);
    render(<Harness />);
    await act(async () => {
      await session.logout();
    });
    await act(async () => pending.resolve(alice));
    expect(screen.getByTestId("identity").textContent).toBe("anonymous");
  });
  it("clears cached orders, conversations and cart before switching accounts", async () => {
    vi.mocked(authService.getSession).mockResolvedValue(alice);
    orderFetch
      .mockResolvedValueOnce(["alice-order"])
      .mockResolvedValue(["bob-order"]);
    vi.mocked(messagesService.listConversations)
      .mockResolvedValueOnce([
        {
          id: "c1",
          subject: "alice-secret",
          messages: [],
          unreadCount: 1,
        } as never,
      ])
      .mockResolvedValue([]);
    render(<Harness />);
    await waitFor(() =>
      expect(screen.getByTestId("orders").textContent).toBe("alice-order"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("messages").textContent).toBe("alice-secret"),
    );
    fireEvent.click(screen.getByText("Add item"));
    expect(screen.getByTestId("cart").textContent).toBe("1");
    await act(async () => {
      await session.logout();
    });
    expect(screen.getByTestId("orders").textContent).toBe("");
    expect(screen.getByTestId("messages").textContent).toBe("");
    expect(screen.getByTestId("cart").textContent).toBe("0");
    await act(async () => {
      await session.login(bob.email, "password");
    });
    await waitFor(() =>
      expect(screen.getByTestId("orders").textContent).toBe("bob-order"),
    );
    expect(screen.getByTestId("messages").textContent).not.toContain("alice");
  });
  it("ignores late order and conversation responses from the old account", async () => {
    const oldOrders = deferred<string[]>();
    const oldMessages =
      deferred<Awaited<ReturnType<typeof messagesService.listConversations>>>();
    vi.mocked(authService.getSession).mockResolvedValue(alice);
    orderFetch
      .mockReturnValueOnce(oldOrders.promise)
      .mockResolvedValue(["bob-order"]);
    vi.mocked(messagesService.listConversations)
      .mockReturnValueOnce(oldMessages.promise)
      .mockResolvedValue([]);
    render(<Harness />);
    await waitFor(() => expect(orderFetch).toHaveBeenCalledTimes(1));
    await act(async () => {
      await session.logout();
    });
    await act(async () => {
      await session.login(bob.email, "password");
    });
    await act(async () => {
      oldOrders.resolve(["alice-order"]);
      oldMessages.resolve([
        {
          id: "old",
          subject: "alice-secret",
          messages: [],
          unreadCount: 1,
        } as never,
      ]);
    });
    await waitFor(() =>
      expect(screen.getByTestId("orders").textContent).toBe("bob-order"),
    );
    expect(screen.getByTestId("messages").textContent).toBe("");
  });
  it("hides private content immediately and exposes retry when server logout fails", async () => {
    vi.mocked(authService.getSession).mockResolvedValue(alice);
    const pending = deferred<void>();
    vi.mocked(authService.clearSession)
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(undefined);
    render(<Harness guarded />);
    await screen.findByText("private-page");
    let result!: Promise<{ success: boolean }>;
    act(() => {
      result = session.logout();
    });
    expect(screen.queryByText("private-page")).toBeNull();
    expect(screen.getByTestId("identity").textContent).toBe("anonymous");
    await act(async () => {
      pending.reject(new Error("offline"));
      await result;
    });
    expect((await result).success).toBe(false);
    expect(screen.getByRole("alert").textContent).toContain(
      "Sign out could not be completed",
    );
    expect((await session.login(bob.email, "password")).success).toBe(false);
    await act(async () => {
      await session.retrySession();
    });
    expect(screen.getByTestId("status").textContent).toBe("anonymous");
    expect(authService.clearSession).toHaveBeenCalledTimes(2);
  });
  it("shows session network errors as retryable errors rather than a logged-out redirect", async () => {
    vi.mocked(authService.getSession)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(alice);
    render(<Harness guarded />);
    await screen.findByRole("alert");
    expect(screen.queryByText("redirect:/")).toBeNull();
    await act(async () => {
      await session.retrySession();
    });
    expect(screen.getByText("private-page")).toBeTruthy();
  });
});

describe("account mutation session state", () => {
  it("updates the displayed identity without discarding cart state", async () => {
    vi.mocked(authService.getSession).mockResolvedValue(alice);
    vi.mocked(authService.updateProfile).mockResolvedValue({
      ...alice,
      name: "New Alice",
    });
    render(<Harness />);
    await waitFor(() => expect(session.user?.id).toBe("alice"));
    fireEvent.click(screen.getByText("Add item"));
    const scope = session.sessionKey;
    await act(async () => {
      expect((await session.updateProfile("New Alice")).success).toBe(true);
    });
    expect(session.user?.name).toBe("New Alice");
    expect(session.sessionKey).toBe(scope);
    expect(screen.getByTestId("cart").textContent).toBe("1");
  });
  it("clears private state after password replacement", async () => {
    vi.mocked(authService.getSession).mockResolvedValue(alice);
    vi.mocked(authService.changePassword).mockResolvedValue(undefined);
    render(<Harness guarded />);
    await screen.findByText("private-page");
    fireEvent.click(screen.getByText("Add item"));
    await act(async () => {
      expect((await session.changePassword("old", "new")).success).toBe(true);
    });
    expect(screen.getByTestId("identity").textContent).toBe("anonymous");
    expect(screen.getByTestId("cart").textContent).toBe("0");
    expect(screen.queryByText("private-page")).toBeNull();
  });
  it("hides private state when a lost password-change response leaves the result uncertain", async () => {
    vi.mocked(authService.getSession).mockResolvedValue(alice);
    vi.mocked(authService.changePassword).mockRejectedValue(
      new Error("network failure"),
    );
    render(<Harness guarded />);
    await screen.findByText("private-page");
    await act(async () => {
      expect((await session.changePassword("old", "new")).success).toBe(false);
    });
    expect(screen.queryByText("private-page")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain(
      "could not be confirmed",
    );
    vi.mocked(authService.getSession).mockResolvedValue(null);
    await act(async () => {
      await session.retrySession();
    });
    expect(session.status).toBe("anonymous");
  });
});

describe("cross-tab session changes", () => {
  it("immediately hides old private state while checking a change in another tab", async () => {
    vi.mocked(authService.getSession).mockResolvedValueOnce(alice);
    render(<Harness guarded />);
    await screen.findByText("private-page");
    fireEvent.click(screen.getByText("Add item"));
    const pending = deferred<User | null>();
    vi.mocked(authService.getSession).mockReturnValue(pending.promise);
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: SESSION_EVENT_KEY,
          newValue: "logout-in-other-tab",
        }),
      ),
    );
    expect(screen.queryByText("private-page")).toBeNull();
    expect(screen.getByTestId("cart").textContent).toBe("0");
    await act(async () => pending.resolve(null));
    expect(session.status).toBe("anonymous");
  });
  it("discards an in-flight login response when another tab changes the session", async () => {
    const login = deferred<User>();
    vi.mocked(authService.login).mockReturnValueOnce(login.promise);
    render(<Harness />);
    await waitFor(() => expect(session.status).toBe("anonymous"));
    let result!: ReturnType<typeof session.login>;
    act(() => {
      result = session.login(alice.email, "password");
    });
    vi.mocked(authService.getSession).mockResolvedValue(bob);
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: SESSION_EVENT_KEY,
          newValue: "different-tab",
        }),
      ),
    );
    await act(async () => {
      login.resolve(alice);
      await result;
    });
    await waitFor(() => expect(session.user?.id).toBe("bob"));
    expect((await result).success).toBe(false);
  });
});
