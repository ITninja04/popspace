const { shared } = require("../lib/_lib")
const Api = require("./api")
const http = require("./http")
const routes = require("./routes")

const saveDefaultRoom = async (userId, roomId)  => {
  /*
    Sadly, massivejs doesn't really have an upsert
    https://massivejs.org/docs/persistence#save
    Perhaps we can make our own more generic,
    and not do this type of statement each time.
  */
  const existingDefault = await shared.db.pg.massive.default_rooms.findOne({user_id: userId})
  if(existingDefault) {
    return await shared.db.pg.massive.default_rooms.update({
      user_id: userId
    }, {
      room_id: roomId
    })
  } else {
    return await shared.db.pg.massive.default_rooms.insert({user_id: userId, room_id: roomId})
  }
}

const carefulDynamoCall = async (endpoint, req, res, f) => {
  try {
    f()
  } catch(e) {
    if(e.code == 'ProvisionedThroughputExceededException') {
      log.error.error(`Dynamo throughput excededed (${endpoint}): (user_id ${req.user.id}, body ${JSON.stringify(req.body)})\n${e})`)
      return http.fail(req, res, shared.error.code.RATE_LIMIT_EXCEEDED, `Widget database write capacity temporarily exceeded, please retry`)
    } else {
      log.error.error(`Unexpected error (${endpoint}) (user_id ${req.user.id}, body ${JSON.stringify(req.body)})\n${e}`)
      return http.fail(req, res, shared.error.code.UNEXPECTER_ERROR, `Could not complete request.`)
    }
  }
}

class MercuryApi {
  constructor(mercury) {
    this.mercury = mercury
    this.api = new Api(mercury.getExpress())
    this.initPostRoutes()
    /*
      Make sure to run this last so we can handle errors
      for all endpoints
    */
    this.api.setupGenericErrorHandling()
  }

  initPostRoutes() {
    this.api.loggedInPostEndpoint("/subscribe_to_newsletter", async (req, res) => {
      await shared.db.accounts.newsletterSubscribe(req.user.id)
      return await http.succeed(req, res, {})
    })

    this.api.loggedInPostEndpoint("/unsubscribe_from_newsletter", async (req, res) => {
      await shared.db.accounts.newsletterUnsubscribe(req.user.id)
      return await http.succeed(req, res, {})
    })

    this.api.loggedOutPostEndpoint("/magic_link_subscribe", async (req, res) => {
      const magicLinkId = req.body.magic_link_id
      const otp = req.body.otp
      const request = await shared.db.magic.magicLinkById(magicLinkId)
      const result = await shared.db.magic.tryToSubscribe(request, otp)
      if (result.error) {
        return await http.authFail(req, res, result.error)
      }
      return await http.succeed(req, res, {})
    })

    this.api.loggedOutPostEndpoint("/magic_link_unsubscribe", async (req, res) => {
      const magicLinkId = req.body.magic_link_id
      const otp = req.body.otp
      const request = await shared.db.magic.magicLinkById(magicLinkId)
      const result = await shared.db.magic.tryToUnsubscribe(request, otp)
      if (result.error) {
        return await http.authFail(req, res, result.error)
      }
      return await http.succeed(req, res, {})
    })

    this.api.ownerOnlyRoomRouteEndpoint("/enable_public_invite_link", async (req, res) => {
      const roomState = await shared.db.dynamo.room.getRoomState(req.room.id)
      const inviteRouteEntry = await shared.db.room.invites.enablePublicInviteUrl(
        req.room.id,
        req.user.id,
        roomState.display_name
      )
      const inviteRoute = routes.publicInviteRoute(inviteRouteEntry)
      return http.succeed(req, res, { otp: inviteRouteEntry.otp, inviteId: inviteRouteEntry.id })
    })

    this.api.memberOrOwnerRoomRouteEndpoint("/get_public_invite_details", async (req, res) => {
      const routeEntries = await shared.db.room.invites.getActivePublicInviteUrls(req.room.id)
      const inviteDetails = routeEntries.map((entry) => ({ inviteId: entry.id, otp: entry.otp }))
      return http.succeed(req, res, { inviteDetails })
    })

    this.api.loggedInPostEndpoint("/room_membership_through_public_invite_link", async (req, res) => {
      /**
        We currently committed to not limiting the number of memberships, with
        a quick followup of limiting the number of participants
        https://withlabs.slack.com/archives/C017MFP9142/p1613676951294300
      */
      const otp = req.body.otp
      const inviteId = req.body.invite_id
      if (!inviteId) {
        return http.fail(req, res, "Must provide inviteId", { errorCode: shared.error.code.INVALID_API_PARAMS })
      }
      const invite = await shared.db.room.invites.inviteById(inviteId)
      if (!invite) {
        return http.fail(req, res, "No such invite", { errorCode: shared.error.code.INVALID_INVITE })
      }
      const resolve = await shared.db.room.invites.joinRoomThroughPublicInvite(invite, req.user, otp)
      if (resolve.error) {
        if (resolve.error == shared.error.code.JOIN_ALREADY_MEMBER) {
          const roomNameEntry = await shared.db.rooms.preferredNameById(invite.room_id)
          return http.succeed(req, res, { roomRoute: roomNameEntry.name })
        }
        return http.fail(req, res, "Unable to become member.", { errorCode: resolve.error })
      }
      const roomNameEntry = await shared.db.rooms.preferredNameById(invite.room_id)
      return http.succeed(req, res, { roomRoute: roomNameEntry.name })
    })

    this.api.ownerOnlyRoomRouteEndpoint("/reset_public_invite_link", async (req, res) => {
      await shared.db.room.invites.disablePublicInviteUrl(req.room.id)
      const inviteRouteEntry = await shared.db.room.invites.enablePublicInviteUrl(req.room.id)
      const inviteRoute = routes.publicInviteRoute(inviteRouteEntry)
      return http.succeed(req, res, { otp: inviteRouteEntry.otp, inviteId: inviteRouteEntry.id })
    })

    this.api.ownerOnlyRoomRouteEndpoint("/disable_public_invite_link", async (req, res) => {
      const result = await shared.db.room.invites.disablePublicInviteUrl(req.room.id)
      return http.succeed(req, res)
    })

    this.api.memberOrOwnerRoomRouteEndpoint("/set_default_room", async (req, res) => {
      await saveDefaultRoom(req.user.id, req.room.id)
      return http.succeed(req, res)
    })

    this.api.memberRoomRouteEndpoint("/remove_self_from_room", async (req, res) => {
      await shared.db.room.memberships.revokeMembership(req.room.id, req.user.id)
      return http.succeed(req, res)      
    })

    this.api.loggedInPostEndpoint("/get_or_init_default_room", async (req, res) => {
      async function initializeDefaultRoom() {
        let result
        const firstOwnedRoom = await shared.db.pg.massive.rooms.findOne({
          owner_id: req.user.id,
        })
        if (firstOwnedRoom) {
          result = {
            user_id: req.user.id,
            room_id: firstOwnedRoom.id,
          }
        } else {
          const firstRoomMembership = await shared.db.pg.massive.room_memberships.findOne({
            user_id: req.user.id,
          })
          if (!firstRoomMembership) {
            return null
          }
          result = {
            user_id: req.user.id,
            room_id: firstRoomMembership.room_id,
          }
        }
        // write the chosen default so it remains stable for future requests
        await saveDefaultRoom(result.user_id, result.room_id)
        return result
      }

      console.log(`------- user : ${req.user.id}`)
      let defaultRoom = await shared.db.pg.massive.default_rooms.findOne({
        user_id: req.user.id,
      })

      // if no default_room row exists, we fallback to a heuristic -
      // choose an arbitrary owned room, if no owned rooms choose an arbitrary
      // membership room.
      if (!defaultRoom) {
        defaultRoom = await initializeDefaultRoom()
      }

      if(!defaultRoom) {
        return await http.fail(req, res, "No owned or member rooms", lib.ErrorCodes.NO_DEFAULT_ROOM)
      }

      // if the user no longer has access to their default room,
      // re-initialize it
      if (!(await shared.db.room.memberships.hasAccess(req.user.id, defaultRoom.room_id))) {
        defaultRoom = await initializeDefaultRoom()
      }

      if(!defaultRoom) {
        return await http.fail(req, res, "No owned or member rooms", lib.ErrorCodes.NO_DEFAULT_ROOM)
      }

      let preferredRoute = await shared.db.rooms.latestMostPreferredRouteEntry(defaultRoom.room_id)
      if (!preferredRoute) {
        // there's a chance the room referenced by the existing default_rooms row
        // was deleted. re-initialize with a new default
        defaultRoom = await initializeDefaultRoom()
        if(!defaultRoom) {
          return await http.fail(req, res, "No owned or member rooms", lib.ErrorCodes.NO_DEFAULT_ROOM)
        }
        preferredRoute = await shared.db.rooms.latestMostPreferredRouteEntry(defaultRoom.room_id)
        if (!preferredRoute) {
          return http.fail(req, res, "Unexpected error getting default room", {
            errorCode: lib.ErrorCodes.UNEXPECTED_ERROR,
          })
        }
      }
      const preferredRouteName = preferredRoute.name
      return http.succeed(req, res, { room_route: preferredRouteName })
    })

    this.api.loggedInPostEndpoint("/profile", async (req, res) => {
      /*
        This seems much better than having to try/catch each time
      */
      await carefulDynamoCall("/profile", req, res, async () => {
        const profile = new shared.models.Profile(req.user.id)
        const serialized = await profile.serialize()
        return http.succeed(req, res, { profile: serialized } )
      })
    })

    this.api.loggedInPostEndpoint("/update_participant_state", async (req, res) => {
      await carefulDynamoCall("/update_participant_state", req, res, async () => {
        await shared.db.dynamo.room.setParticipantState(req.user.id, req.body.participant_state)
        return http.succeed(req, res, { participantState: req.body.participant_state })
      })
    })
  }
}

module.exports = MercuryApi
