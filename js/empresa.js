const f =
  await getFirebase();

if (f) {
  await f.set(
    f.ref(
      f.db,
      `rooms/${roomCode}/accessRequests/${requestKey}`
    ),
    request
  );

  room =
    latest;
} else {
  await saveWholeRoom(
    latest
  );
}
