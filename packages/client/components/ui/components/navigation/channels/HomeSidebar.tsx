import { BiSolidHome, BiSolidNotepad, BiSolidUserDetail } from "solid-icons/bi";
import { Match, Show, Switch, createMemo, splitProps } from "solid-js";
import { styled } from "solid-styled-components";

import { VirtualContainer } from "@minht11/solid-virtual-container";
import { Channel, Client } from "revolt.js";

import { ChannelContextMenu, UserContextMenu } from "@revolt/app";
import { useClient } from "@revolt/client";
import { useQuantity, useTranslation } from "@revolt/i18n";
import { TextWithEmoji } from "@revolt/markdown";
import { modalController } from "@revolt/modal";
import { useLocation, useNavigate } from "@revolt/routing";
import { iconSize } from "@revolt/ui";

import MdPlus from "@material-design-icons/svg/outlined/add.svg?component-solid";

import { Avatar } from "../../design/atoms/display/Avatar";
import { Typography } from "../../design/atoms/display/Typography";
import { UserStatusGraphic } from "../../design/atoms/indicators";
import { MenuButton } from "../../design/atoms/inputs/MenuButton";
import { Column } from "../../design/layout";
import { OverflowingText } from "../../design/layout/OverflowingText";
import { Tooltip } from "../../floating";
import { Deferred } from "../../tools";

import { SidebarBase } from "./common";

interface Props {
  /**
   * Ordered list of conversations
   */
  conversations: () => Channel[];

  /**
   * Current channel ID
   */
  channelId?: string;

  /**
   * Open the saved notes channel
   */
  openSavedNotes: (
    navigate?: ReturnType<typeof useNavigate>
  ) => string | undefined;

  /**
   * Whether to display friends menu
   */
  __tempDisplayFriends: () => boolean;
}

/**
 * Display home navigation and conversations
 */
export const HomeSidebar = (props: Props) => {
  const t = useTranslation();
  const client = useClient();
  const navigate = useNavigate();
  const location = useLocation();

  const savedNotesChannelId = createMemo(() => props.openSavedNotes());

  let scrollTargetElement!: HTMLDivElement;

  return (
    <SidebarBase>
      <div
        ref={scrollTargetElement}
        use:scrollable={{ direction: "y", showOnHover: true }}
      >
        <List>
          <SidebarTitle>
            <Typography variant="sidebar-title">
              {t("app.main.categories.conversations")}
            </Typography>
          </SidebarTitle>

          <a href="/">
            <MenuButton
              size="normal"
              icon={<BiSolidHome size={24} />}
              attention={location.pathname === "/" ? "selected" : "normal"}
            >
              {t("app.navigation.tabs.home")}
            </MenuButton>
          </a>

          <Show when={props.__tempDisplayFriends()}>
            <a href="/friends">
              <MenuButton
                size="normal"
                icon={<BiSolidUserDetail size={24} />}
                attention={
                  location.pathname === "/friends" ? "selected" : "normal"
                }
              >
                {t("app.navigation.tabs.friends")}
              </MenuButton>
            </a>
          </Show>

          <Switch
            fallback={
              <MenuButton
                size="normal"
                attention={"normal"}
                icon={<BiSolidNotepad size={24} />}
                // eslint-disable-next-line solid/reactivity
                onClick={() => props.openSavedNotes(navigate)}
              >
                {t("app.navigation.tabs.saved")}
              </MenuButton>
            }
          >
            <Match when={savedNotesChannelId()}>
              <a href={`/channel/${savedNotesChannelId()}`}>
                <MenuButton
                  size="normal"
                  icon={<BiSolidNotepad size={24} />}
                  attention={
                    props.channelId && savedNotesChannelId() === props.channelId
                      ? "selected"
                      : "normal"
                  }
                >
                  {t("app.navigation.tabs.saved")}
                </MenuButton>
              </a>
            </Match>
          </Switch>

          <span
            style={{
              display: "flex",
              "padding-top": "var(--gap-md)",
              "padding-inline": "var(--gap-md)",
              "align-items": "center",
              "justify-content": "space-between",
              // TODO style this
            }}
          >
            <Typography variant="category">Direct Messages</Typography>
            <a
              onClick={() =>
                modalController.push({
                  type: "create_group",
                  client: client(),
                })
              }
            >
              <MdPlus {...iconSize(14)} />
            </a>
          </span>

          <Deferred>
            <VirtualContainer
              items={props.conversations()}
              scrollTarget={scrollTargetElement}
              itemSize={{ height: 48 }}
            >
              {(item) => (
                <div
                  style={{
                    ...item.style,
                    width: "100%",
                    "padding-block": "3px",
                  }}
                >
                  <Entry
                    // @ts-expect-error missing type on Entry
                    role="listitem"
                    tabIndex={item.tabIndex}
                    style={item.style}
                    channel={item.item}
                    active={item.item.id === props.channelId}
                  />
                </div>
              )}
            </VirtualContainer>
          </Deferred>
        </List>
      </div>
    </SidebarBase>
  );
};

/**
 * Sidebar title
 */
const SidebarTitle = styled.p`
  padding-bottom: ${(props) => props.theme!.gap.md};
  padding-inline: ${(props) => props.theme!.gap.lg};
`;

/**
 * Single conversation entry
 */
function Entry(
  props: { channel: Channel; active: boolean } /*& Omit<
    ComponentProps<typeof Link>,
    "href"
  >*/
) {
  const [local, remote] = splitProps(props, ["channel", "active"]);

  const q = useQuantity();
  const t = useTranslation();

  /**
   * Determine user status if present
   */
  const status = () =>
    local.channel.recipient?.statusMessage((presence) =>
      t(`app.status.${presence.toLowerCase()}`)
    );

  return (
    <a {...remote} href={`/channel/${local.channel.id}`}>
      <MenuButton
        size="normal"
        alert={
          !local.active &&
          local.channel.unread &&
          (local.channel.mentions?.size || true)
        }
        attention={
          local.active ? "selected" : local.channel.unread ? "active" : "normal"
        }
        icon={
          <Switch>
            <Match when={local.channel.type === "Group"}>
              <Avatar
                size={32}
                shape="rounded-square"
                fallback={local.channel.name}
                src={local.channel.iconURL}
                primaryContrast
              />
            </Match>
            <Match when={local.channel.type === "DirectMessage"}>
              <Avatar
                size={32}
                src={local.channel.iconURL}
                holepunch="bottom-right"
                overlay={
                  <UserStatusGraphic
                    status={local.channel?.recipient?.presence}
                  />
                }
              />
            </Match>
          </Switch>
        }
        use:floating={{
          contextMenu: () =>
            local.channel.type === "DirectMessage" ? (
              <UserContextMenu
                user={local.channel.recipient!}
                channel={local.channel}
              />
            ) : (
              <ChannelContextMenu channel={local.channel} />
            ),
        }}
      >
        <Column gap="none">
          <Switch>
            <Match when={local.channel.type === "Group"}>
              <OverflowingText>
                <TextWithEmoji content={local.channel.name!} />
              </OverflowingText>
              <Typography variant="status">
                {q("members", local.channel.recipients.length || 0)}
              </Typography>
            </Match>
            <Match when={local.channel.type === "DirectMessage"}>
              <OverflowingText>
                {local.channel?.recipient?.displayName}
              </OverflowingText>
              <Show when={status()}>
                <Tooltip
                  content={() => <TextWithEmoji content={status()!} />}
                  placement="top-start"
                  aria={status()!}
                >
                  <OverflowingText>
                    <Typography variant="status">
                      <TextWithEmoji content={status()!} />
                    </Typography>
                  </OverflowingText>
                </Tooltip>
              </Show>
            </Match>
          </Switch>
        </Column>
      </MenuButton>
    </a>
  );
}

/**
 * Inner scrollable list
 * We fix the width in order to prevent scrollbar from moving stuff around
 */
const List = styled.div`
  padding: ${(props) => props.theme!.gap.md};
  width: ${(props) => props.theme!.layout.width["channel-sidebar"]};
`;
