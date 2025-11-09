import comm


COMM_NAME = "jupyterpack:broadcast:comm"


def create_widget_comm(
    data: dict | None = None,
    metadata: dict | None = None,
    comm_id: str | None = None,
):
    _comm = comm.create_comm(
        comm_id=comm_id,
        target_name=COMM_NAME,
        data=data,
        metadata=metadata,
    )
    return _comm


def handle_comm_opened(*args, **kwargs):
    pass


def register_comm_target():
    comm_manager = comm.get_comm_manager()
    if comm_manager is not None:
        comm_manager.register_target(COMM_NAME, handle_comm_opened)
