import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@iconify/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ImpersonationBanner } from "@/components/common/ImpersonationBanner";
import { DataFreshnessFooter } from "@/components/layout/DataFreshnessFooter";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { ApiError } from "@/lib/generated-api/core/ApiError";

const SIDEBAR_COLLAPSED_KEY = "pbsmon.sidebarCollapsed";

type MenuItem = {
  id: string;
  path: string;
  translationKey: string;
  icon?: ReactNode;
  isExpandable?: boolean;
  subItems?: Omit<MenuItem, "isExpandable" | "subItems">[];
};

type SupportLink = {
  id: string;
  href: string;
  translationKey: string;
  icon: ReactNode;
  external?: boolean;
};

const menuItems: MenuItem[] = [
  {
    id: "personal-view",
    path: "/personal-view",
    translationKey: "pages.personalView",
    icon: (
      <Icon
        icon="material-symbols:dashboard-outline-rounded"
        className="w-6 h-6"
      />
    ),
  },
  {
    id: "qsub-assembler",
    path: "/qsub-assembler",
    translationKey: "pages.qsubAssembler",
    icon: <Icon icon="oui:compute" className="w-6 h-6" />,
  },
  {
    id: "resource-status",
    path: "/resource-status",
    translationKey: "pages.resourceStatus",
    isExpandable: true,
    icon: (
      <Icon
        icon="material-symbols:ecg-heart-outline-sharp"
        className="w-6 h-6"
      />
    ),
    subItems: [
      { id: "machines", path: "/machines", translationKey: "pages.machines" },
      {
        id: "storage-spaces",
        path: "/storage-spaces",
        translationKey: "pages.storageSpaces",
      },
      { id: "projects", path: "/projects", translationKey: "pages.projects" },
      { id: "queues", path: "/queues", translationKey: "pages.queues" },
      { id: "jobs", path: "/jobs", translationKey: "pages.jobs" },
      { id: "users", path: "/users", translationKey: "pages.users" },
      { id: "groups", path: "/groups", translationKey: "pages.groups" },
      /*  { id: "outages", path: "/outages", translationKey: "pages.outages" },
      { id: "status", path: "/status", translationKey: "pages.currentStatus" }, */
    ],
  },
];

const supportLinks: SupportLink[] = [
  {
    id: "user-support",
    href: "https://www.metacentrum.cz/cs/about/user_support.html",
    translationKey: "pages.userSupport",
    external: true,
    icon: (
      <Icon
        icon="streamline-plump:customer-support-7-remix"
        className="w-6 h-6"
      />
    ),
  },
  {
    id: "documentation",
    href: "https://docs.metacentrum.cz/en/docs/welcome",
    translationKey: "pages.documentation",
    external: true,
    icon: (
      <Icon icon="material-symbols:docs-outline-rounded" className="w-6 h-6" />
    ),
  },
  {
    id: "faq",
    href: "https://docs.metacentrum.cz/docs/support/faqs",
    translationKey: "pages.faq",
    external: true,
    icon: <Icon icon="mdi:question-mark-circle-outline" className="w-6 h-6" />,
  },
  {
    id: "metacentrum",
    href: "https://www.metacentrum.cz",
    translationKey: "pages.metacentrum",
    external: true,
    icon: <Icon icon="streamline-plump:web" className="w-6 h-6" />,
  },
];

export function SidebarLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { data: currentUser, isLoading, error } = useCurrentUser();
  const { impersonatedUsername } = useImpersonation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(["resource-status"])
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Icon-only sidebar only applies on desktop; the mobile drawer stays full.
  const collapsed = isDesktop && isSidebarCollapsed;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SIDEBAR_COLLAPSED_KEY,
        isSidebarCollapsed ? "true" : "false"
      );
    } catch {
      // ignore storage errors (private mode, disabled storage)
    }
  }, [isSidebarCollapsed]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "GET",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
    window.location.href = 'https://login.e-infra.cz/oidc/endsession';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-primary-600">
        <nav className="h-[45px] bg-[#424441] border-b-[10px] border-secondary flex items-center justify-end px-4 gap-2">
          <button
            onClick={() => i18n.changeLanguage("cs")}
            className={`p-1.5 rounded transition-opacity ${
              i18n.language === "cs"
                ? "opacity-100"
                : "opacity-50 hover:opacity-75"
            }`}
            title={t("language.czech")}
          >
            <Icon icon="flag:cz-4x3" className="w-6 h-4" />
          </button>
          <button
            onClick={() => i18n.changeLanguage("en")}
            className={`p-1.5 rounded transition-opacity ${
              i18n.language === "en"
                ? "opacity-100"
                : "opacity-50 hover:opacity-75"
            }`}
            title={t("language.english")}
          >
            <Icon icon="flag:gb-4x3" className="w-6 h-4" />
          </button>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-lg">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  // Show error page
  if (error) {
    const isUnauthorized = error instanceof ApiError && error.status === 401;

    return (
      <div className="flex flex-col min-h-screen bg-primary-600">
        <nav className="h-[45px] bg-[#424441] border-b-[10px] border-secondary flex items-center justify-end px-4 gap-2">
          <button
            onClick={() => i18n.changeLanguage("cs")}
            className={`p-1.5 rounded transition-opacity ${
              i18n.language === "cs"
                ? "opacity-100"
                : "opacity-50 hover:opacity-75"
            }`}
            title={t("language.czech")}
          >
            <Icon icon="flag:cz-4x3" className="w-6 h-4" />
          </button>
          <button
            onClick={() => i18n.changeLanguage("en")}
            className={`p-1.5 rounded transition-opacity ${
              i18n.language === "en"
                ? "opacity-100"
                : "opacity-50 hover:opacity-75"
            }`}
            title={t("language.english")}
          >
            <Icon icon="flag:gb-4x3" className="w-6 h-4" />
          </button>
        </nav>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-4">
            <div className="text-red-800">
              {isUnauthorized
                ? t("common.redirectingToLogin")
                : `${t("common.errorLoading")} ${
                    error instanceof Error
                      ? error.message
                      : t("common.unknownError")
                  }`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const isItemActive = (item: MenuItem): boolean => {
    if (item.subItems) {
      return item.subItems.some((subItem) =>
        location.pathname.startsWith(subItem.path)
      );
    }
    return location.pathname === item.path;
  };

  return (
    <div className="flex flex-col min-h-screen bg-primary-600">
      {/* Top Navbar */}
      <nav className="h-[45px] bg-[#424441] border-b-[10px] border-secondary flex items-center px-4 gap-2">
        <button
          onClick={() => setIsMobileMenuOpen((v) => !v)}
          className="md:hidden text-white p-1 mr-1"
          aria-label={t("common.toggleMenu")}
        >
          <Icon
            icon={isMobileMenuOpen ? "mdi:close" : "mdi:menu"}
            className="w-6 h-6"
          />
        </button>
        <button
          onClick={() => setIsSidebarCollapsed((v) => !v)}
          className="hidden md:inline-flex text-white p-1 mr-1 hover:opacity-75 transition-opacity"
          aria-label={
            isSidebarCollapsed
              ? t("common.expandMenu")
              : t("common.collapseMenu")
          }
          title={
            isSidebarCollapsed
              ? t("common.expandMenu")
              : t("common.collapseMenu")
          }
        >
          <Icon
            icon={
              isSidebarCollapsed ? "mdi:menu" : "mdi:menu-open"
            }
            className="w-6 h-6"
          />
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => i18n.changeLanguage("cs")}
            className={`p-1.5 rounded transition-opacity ${
              i18n.language === "cs"
                ? "opacity-100"
                : "opacity-50 hover:opacity-75"
            }`}
            title={t("language.czech")}
          >
            <Icon icon="flag:cz-4x3" className="w-6 h-4" />
          </button>
          <button
            onClick={() => i18n.changeLanguage("en")}
            className={`p-1.5 rounded transition-opacity ${
              i18n.language === "en"
                ? "opacity-100"
                : "opacity-50 hover:opacity-75"
            }`}
            title={t("language.english")}
          >
            <Icon icon="flag:gb-4x3" className="w-6 h-4" />
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex flex-1">
        <aside
          className={[
            "w-64 bg-primary-600 text-white flex flex-col shadow-[1px_1px_5px_rgba(0,0,0,0.25),inset_0_0_8px_rgba(0,0,0,0.25)]",
            "fixed inset-y-0 left-0 z-50 transition-all duration-300 overflow-y-auto",
            "md:static md:inset-auto md:translate-x-0",
            collapsed ? "md:w-20" : "md:w-64",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div
            className={[
              "pt-10 pb-6 border-b border-primary-700",
              collapsed
                ? "flex justify-center px-2"
                : "pl-[29px] pr-4",
            ].join(" ")}
          >
            <img
              src={
                collapsed
                  ? "/images/logo-small.svg"
                  : "/images/logo-white.svg"
              }
              alt={t("common.logoAlt")}
              className={collapsed ? "h-[47px] w-auto" : "w-[195px] h-[47px]"}
            />
          </div>
          <nav>
            <ul className="space-y-0">
              <li>
                <a
                  href="https://profile.e-infra.cz"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={collapsed ? currentUser?.username || "---" : undefined}
                  className={[
                    "flex items-center h-[54px] text-white hover:bg-primary-700 transition-colors",
                    collapsed
                      ? "justify-center px-0"
                      : "gap-[14px] pl-[14px] pr-4",
                  ].join(" ")}
                >
                  <Icon icon="mdi:account" className="w-6 h-6" />
                  {!collapsed && (
                    <>
                      <span className="text-sm flex-1">
                        {currentUser?.username || "---"}
                      </span>
                      <Icon
                        icon="mdi:open-in-new"
                        className="w-[11px] h-[11px] text-white"
                      />
                    </>
                  )}
                </a>
              </li>
              {menuItems.map((item) => (
                <li key={item.id}>
                  {item.isExpandable ? (
                    <>
                      <button
                        onClick={() =>
                          collapsed
                            ? setIsSidebarCollapsed(false)
                            : toggleExpanded(item.id)
                        }
                        title={collapsed ? t(item.translationKey) : undefined}
                        className={[
                          "w-full flex items-center h-[54px] transition-colors",
                          collapsed
                            ? "justify-center px-0"
                            : "justify-between pl-[14px] pr-4",
                          isItemActive(item)
                            ? "bg-secondary text-white"
                            : "text-white hover:bg-primary-700",
                        ].join(" ")}
                      >
                        <div
                          className={
                            collapsed
                              ? "flex items-center"
                              : "flex items-center gap-[14px]"
                          }
                        >
                          {item.icon}
                          {!collapsed && <span>{t(item.translationKey)}</span>}
                        </div>
                        {!collapsed && (
                          <Icon
                            icon="mdi:chevron-down"
                            className={`w-[14px] h-[14px] text-white transition-transform ${
                              expandedItems.has(item.id) ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </button>
                      {!collapsed &&
                        expandedItems.has(item.id) &&
                        item.subItems && (
                        <ul className="bg-[#82909E]">
                          {item.subItems.map((subItem, index) => {
                            const isLast = index === item.subItems!.length - 1;
                            const isActive = location.pathname.startsWith(
                              subItem.path
                            );
                            return (
                              <li key={subItem.id}>
                                <NavLink
                                  to={subItem.path}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className={[
                                    "flex items-center h-[48px] pl-[53px] pr-4 relative transition-colors",
                                    isActive
                                      ? "bg-[#6B7A8A] text-white font-bold"
                                      : "text-white hover:bg-primary-500",
                                  ].join(" ")}
                                >
                                  {/* Vertical line - to middle for all items, full height for last */}
                                  <div
                                    className={`absolute left-[27px] top-0 w-[17px] border-l border-white ${
                                      isLast ? "h-[24px]" : "h-[48px]"
                                    }`}
                                  ></div>
                                  {/* Horizontal line at middle (only if not last) */}

                                  <div className="absolute left-[27px] top-[23.5px] w-[17px] h-[1px] bg-white"></div>

                                  {t(subItem.translationKey)}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </>
                  ) : (
                    <NavLink
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      title={collapsed ? t(item.translationKey) : undefined}
                      className={({ isActive }) =>
                        [
                          "flex items-center h-[54px] transition-colors",
                          collapsed
                            ? "justify-center px-0"
                            : "gap-[14px] pl-[14px] pr-4",
                          isActive
                            ? "bg-secondary text-white"
                            : "text-white hover:bg-primary-700",
                        ].join(" ")
                      }
                    >
                      {item.icon}
                      {!collapsed && <span>{t(item.translationKey)}</span>}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="border-t border-primary-700">
            <ul className="space-y-0">
              {supportLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    title={collapsed ? t(link.translationKey) : undefined}
                    className={[
                      "flex items-center h-[54px] text-white hover:bg-primary-700 transition-colors",
                      collapsed
                        ? "justify-center px-0"
                        : "gap-[14px] pl-[14px] pr-4",
                    ].join(" ")}
                    {...(link.external && {
                      target: "_blank",
                      rel: "noopener noreferrer",
                    })}
                  >
                    {link.icon}
                    {!collapsed && (
                      <>
                        <span className="text-sm flex-1">
                          {t(link.translationKey)}
                        </span>
                        {link.external && (
                          <Icon
                            icon="mdi:open-in-new"
                            className="w-[11px] h-[11px] text-white"
                          />
                        )}
                      </>
                    )}
                  </a>
                </li>
              ))}

              <li>
                <button
                  onClick={handleLogout}
                  title={collapsed ? t("common.logout") : undefined}
                  className={[
                    "flex items-center h-[54px] w-full text-white hover:bg-primary-700 transition-colors bg-transparent border-none cursor-pointer",
                    collapsed
                      ? "justify-center px-0"
                      : "gap-[14px] pl-[14px] pr-4",
                  ].join(" ")}
                >
                  <Icon icon="mdi:logout" className="w-6 h-6" />
                  {!collapsed && <span>{t("common.logout")}</span>}
                </button>
              </li>

            </ul>
          </div>

          {!collapsed && <DataFreshnessFooter />}
        </aside>
        <main
          className={[
            "flex-1 bg-gray-light",
            collapsed
              ? "md:max-w-[calc(100vw-5rem)]"
              : "md:max-w-[calc(100vw-16rem)]",
          ].join(" ")}
          style={{
            paddingBottom: impersonatedUsername ? "60px" : "0",
          }}
        >
          <Outlet />
        </main>
      </div>
      <ImpersonationBanner />

      <div
        className="
        bg-gray-200 text-gray-800
        bg-blue-100 text-blue-800
        bg-red-100 text-red-800
        bg-green-100 text-green-800
        bg-orange-100 text-orange-800
        bg-gray-100 text-gray-800
        bg-yellow-100 text-yellow-800
        hidden
      "
      ></div>
    </div>
  );
}
