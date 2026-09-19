async function respondAccessRequest(
  requestKey,
  status
) {

  if (
    !currentRoom ||
    !roomData
  ) {
    return;
  }


  try {

    const latest =
      await getLatestRoom();


    latest.accessRequests =
      latest.accessRequests ||
      {};


    const request =
      latest.accessRequests[
        requestKey
      ];


    if (!request) {

      toast(
        "Solicitação não encontrada.",
        "error"
      );

      return;
    }


    const companyId =
      request.companyId ||
      requestKey.replace(
        /__mobile$/,
        ""
      );


    const currentCompany =
      latest.companies?.[
        companyId
      ];


    let passwordUpdated =
      false;


    if (
      status === "approved" &&
      request.passwordMismatch &&
      request.requestedPassword &&
      currentCompany
    ) {

      currentCompany.accessPassword =
        String(
          request.requestedPassword
        );

      currentCompany.passwordVersion =
        2;

      currentCompany.passwordUpdatedAt =
        Date.now();

      latest.companies[
        companyId
      ] =
        currentCompany;

      passwordUpdated =
        true;
    }


    request.status =
      status;

    request.updatedAt =
      Date.now();


    if (
      status === "approved"
    ) {

      request.approvedAt =
        Date.now();

      request.approvedBy =
        "Prof. Leopoldo";

      request.sessionAuthorized =
        true;

    } else {

      request.deniedAt =
        Date.now();

      request.deniedBy =
        "Prof. Leopoldo";

      request.sessionAuthorized =
        false;
    }


    delete request.requestedPassword;


    latest.accessRequests[
      requestKey
    ] =
      request;


    const f =
      await getFirebase();


    if (f) {

      const patchData = {
        [`accessRequests/${requestKey}`]:
          request
      };


      if (
        passwordUpdated &&
        currentCompany
      ) {

        patchData[
          `companies/${companyId}`
        ] =
          currentCompany;
      }


      await f.patch(
        f.ref(
          f.db,
          `rooms/${currentRoom}`
        ),
        patchData
      );

      roomData =
        latest;

      render();

    } else {

      roomData =
        latest;

      await saveRoom();
    }


    toast(

      status === "approved"
        ? (
            request.passwordMismatch
              ? `✅ ${request.companyName} autorizada. Senha atualizada e acesso liberado.`
              : `✅ ${request.companyName} autorizada a entrar.`
          )
        : `❌ Entrada de ${request.companyName} negada.`

    );

  } catch (error) {

    console.error(error);

    toast(
      `Erro ao responder solicitação: ${error.message}`,
      "error"
    );
  }
}
