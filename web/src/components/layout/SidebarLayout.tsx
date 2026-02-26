import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@iconify/react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ImpersonationBanner } from "@/components/common/ImpersonationBanner";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { ApiError } from "@/lib/generated-api/core/ApiError";

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
      {
        id: "waiting-jobs",
        path: "/waiting-jobs",
        translationKey: "pages.waitingJobs",
      },
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

      <div className="flex flex-1">
        <aside className="w-64 bg-primary-600 text-white flex flex-col shadow-[1px_1px_5px_rgba(0,0,0,0.25),inset_0_0_8px_rgba(0,0,0,0.25)]">
          <div className="pl-[29px] pr-4 pt-10 pb-6 border-b border-primary-700">
            <img
              src="/images/logo-white.svg"
              alt={t("common.logoAlt")}
              className="w-[195px] h-[47px]"
            />
          </div>

          <div className="pl-[30px] pr-4 py-4 border-b border-primary-700">
            <a
              href="https://profile.e-infra.cz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-[10px] hover:opacity-80 transition-opacity"
            >
              <div className="w-[30px] h-[30px] flex items-center justify-center">
                <Icon
                  icon="mdi:account"
                  className="w-[30px] h-[30px] text-white"
                />
              </div>
              <span className="text-sm">{currentUser?.username || "---"}</span>
            </a>
          </div>

          <nav>
            <ul className="space-y-0">
              {menuItems.map((item) => (
                <li key={item.id}>
                  {item.isExpandable ? (
                    <>
                      <button
                        onClick={() => toggleExpanded(item.id)}
                        className={[
                          "w-full flex items-center justify-between pl-[14px] pr-4 h-[54px] transition-colors",
                          isItemActive(item)
                            ? "bg-secondary text-white"
                            : "text-white hover:bg-primary-700",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-[14px]">
                          {item.icon}
                          <span>{t(item.translationKey)}</span>
                        </div>
                        <Icon
                          icon="mdi:chevron-down"
                          className={`w-[14px] h-[14px] text-white transition-transform ${
                            expandedItems.has(item.id) ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {expandedItems.has(item.id) && item.subItems && (
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
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-[14px] pl-[14px] pr-4 h-[54px] transition-colors",
                          isActive
                            ? "bg-secondary text-white"
                            : "text-white hover:bg-primary-700",
                        ].join(" ")
                      }
                    >
                      {item.icon}
                      <span>{t(item.translationKey)}</span>
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
                    className="flex items-center gap-[14px] pl-[14px] pr-4 h-[54px] text-white hover:bg-primary-700 transition-colors"
                    {...(link.external && {
                      target: "_blank",
                      rel: "noopener noreferrer",
                    })}
                  >
                    {link.icon}
                    <span className="text-sm flex-1">
                      {t(link.translationKey)}
                    </span>
                    {link.external && (
                      <Icon
                        icon="mdi:open-in-new"
                        className="w-[11px] h-[11px] text-white"
                      />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <main
          className="flex-1 bg-gray-light"
          style={{
            maxWidth: "calc(100vw - var(--spacing) * 64)",
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
